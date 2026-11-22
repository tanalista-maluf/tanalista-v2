import { revalidatePath } from 'next/cache'
import { createNotificationAdmin } from '@/features/notificacoes/actions'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'
import type { Database } from '@/types/database'
import type { GroupSchema } from './schemas'

// Criação de grupo, entrada, saída e pedidos de entrada, sem nada de
// transporte: usado pelas server actions do site (sessão em cookie) e pela API
// do app (token Bearer). Recebe o cliente Supabase já autenticado como o
// usuário e devolve o que aconteceu; quem chama decide para onde ir.

type UserClient = SupabaseClient<Database>

export async function generateUniqueSlug(supabase: UserClient, name: string, excludeId?: string): Promise<string> {
  const base = slugify(name) || 'grupo'
  let candidate = base
  let suffix = 2
  while (true) {
    let q = supabase.from('groups').select('id').eq('slug', candidate)
    if (excludeId) q = q.neq('id', excludeId)
    const { data } = await q.maybeSingle()
    if (!data) return candidate
    candidate = `${base}${suffix++}`
  }
}

export async function createGroup(
  supabase: UserClient,
  userId: string,
  data: GroupSchema
): Promise<{ error: string } | { groupId: string; slug: string }> {
  const slug = await generateUniqueSlug(supabase, data.name)

  // Cria o grupo
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      owner_id: userId,
      name: data.name,
      slug,
      description: data.description || null,
      visibility: data.visibility,
      category: data.category || null,
      city: data.city,
    })
    .select('id, slug')
    .single()

  if (groupError || !group) {
    return { error: 'Erro ao criar grupo. Tente novamente.' }
  }

  // Adiciona o criador como OWNER. Toda escrita em group_members passa pelo
  // service_role: authenticated não tem INSERT/DELETE na tabela, senão qualquer
  // usuário entraria em qualquer grupo, com o papel que quisesse.
  const admin = createAdminClient()
  await admin.from('group_members').insert({
    group_id: group.id,
    user_id: userId,
    role: 'OWNER',
  })

  revalidatePath('/grupos')
  return { groupId: group.id, slug: group.slug ?? group.id }
}

export async function joinGroup(
  supabase: UserClient,
  userId: string,
  groupId: string
): Promise<{ error: string } | { success: true }> {
  // Verifica se o grupo é público
  const { data: group } = await supabase
    .from('groups')
    .select('visibility')
    .eq('id', groupId)
    .single()

  if (!group) return { error: 'Grupo não encontrado.' }
  if (group.visibility === 'PRIVATE') return { error: 'Grupo privado. Solicite convite ao administrador.' }

  const admin = createAdminClient()
  const { error } = await admin.from('group_members').insert({
    group_id: groupId,
    user_id: userId,
    role: 'MEMBER',
  })

  if (error) {
    if (error.code === '23505') return { error: 'Você já é membro deste grupo.' }
    return { error: 'Erro ao entrar no grupo.' }
  }

  revalidatePath(`/grupos/${groupId}`)
  return { success: true }
}

export async function leaveGroup(
  supabase: UserClient,
  userId: string,
  groupId: string
): Promise<{ error: string } | { success: true }> {
  // Dono não pode sair (precisa transferir ou excluir)
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!membership) return { error: 'Você não é membro deste grupo.' }
  if (membership.role === 'OWNER') {
    return { error: 'O dono do grupo não pode sair. Transfira a propriedade primeiro.' }
  }

  const admin = createAdminClient()
  await admin
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)

  revalidatePath(`/grupos/${groupId}`)
  revalidatePath('/grupos')
  return { success: true }
}

// Dono ou administrador aprova ou recusa um pedido de entrada; quem pediu é avisado
export async function decideJoinRequest(
  supabase: UserClient,
  userId: string,
  requestId: string,
  decision: 'APPROVED' | 'REJECTED'
): Promise<{ error: string } | { success: true }> {
  const admin = createAdminClient()
  const { data: req } = await admin
    .from('group_join_requests')
    .select('group_id, user_id, status')
    .eq('id', requestId)
    .maybeSingle()

  if (!req) return { error: 'Solicitação não encontrada.' }

  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', req.group_id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
    return { error: 'Sem permissão.' }
  }

  await admin
    .from('group_join_requests')
    .update({ status: decision, updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (decision === 'APPROVED') {
    const { error: memberError } = await admin
      .from('group_members')
      .upsert({ group_id: req.group_id, user_id: req.user_id, role: 'MEMBER' }, { onConflict: 'group_id,user_id' })

    if (memberError) return { error: 'Erro ao adicionar membro.' }
  }

  const { data: group } = await admin.from('groups').select('name, slug').eq('id', req.group_id).maybeSingle()
  await createNotificationAdmin(
    decision === 'APPROVED'
      ? {
          userId: req.user_id,
          type: 'GROUP_JOIN_APPROVED',
          title: 'Solicitação aprovada!',
          body: `Sua solicitação para entrar em "${group?.name}" foi aprovada.`,
          data: { group_id: req.group_id, group_slug: group?.slug },
        }
      : {
          userId: req.user_id,
          type: 'GROUP_JOIN_REJECTED',
          title: 'Solicitação recusada',
          body: `Sua solicitação para entrar em "${group?.name}" foi recusada.`,
          data: { group_id: req.group_id },
        }
  )

  revalidatePath(`/grupos/${req.group_id}`)
  revalidatePath(`/grupos/${group?.slug ?? req.group_id}/configuracoes`)
  return { success: true }
}
