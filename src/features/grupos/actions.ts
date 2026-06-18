'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'
import type { GroupSchema } from './schemas'

async function generateUniqueSlug(supabase: Awaited<ReturnType<typeof createClient>>, name: string, excludeId?: string): Promise<string> {
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

export async function createGroupAction(data: GroupSchema) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const slug = await generateUniqueSlug(supabase, data.name)

  // Cria o grupo
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      owner_id: user.id,
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

  // Adiciona o criador como OWNER
  await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    role: 'OWNER',
  })

  revalidatePath('/grupos')
  redirect(`/grupos/${group.slug ?? group.id}`)
}

export async function updateGroupAction(groupId: string, data: GroupSchema) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  // Check current name to decide if slug needs regeneration
  const { data: current } = await supabase.from('groups').select('name, slug').eq('id', groupId).single()
  const slug = current?.name !== data.name
    ? await generateUniqueSlug(supabase, data.name, groupId)
    : (current?.slug ?? await generateUniqueSlug(supabase, data.name, groupId))

  const { error } = await supabase
    .from('groups')
    .update({
      name: data.name,
      slug,
      description: data.description || null,
      visibility: data.visibility,
      category: data.category || null,
      city: data.city,
    })
    .eq('id', groupId)
    .eq('owner_id', user.id) // RLS garante, mas dupla verificação

  if (error) return { error: 'Erro ao atualizar grupo.' }

  revalidatePath(`/grupos/${slug}`)
  revalidatePath(`/grupos/${groupId}`)
  return { success: true }
}

export async function joinGroupByInviteAction(token: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.', groupId: null }

  const { data: group } = await supabase
    .from('groups')
    .select('id, name, slug, visibility')
    .eq('invite_token', token)
    .single()

  if (!group) return { error: 'Convite inválido ou expirado.', groupId: null, groupSlug: null }

  // Verificar se já é membro
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) return { groupId: group.id, groupSlug: group.slug, alreadyMember: true }

  const { error } = await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    role: 'MEMBER',
  })

  if (error) return { error: 'Erro ao entrar no grupo.', groupId: null, groupSlug: null }

  revalidatePath(`/grupos/${group.slug ?? group.id}`)
  revalidatePath('/grupos')
  return { groupId: group.id, groupSlug: group.slug, groupName: group.name }
}

export async function regenerateInviteTokenAction(groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data, error } = await supabase
    .from('groups')
    .update({ invite_token: crypto.randomUUID() })
    .eq('id', groupId)
    .eq('owner_id', user.id)
    .select('invite_token')
    .single()

  if (error || !data) return { error: 'Sem permissão.' }

  revalidatePath(`/grupos/${groupId}`)
  return { token: data.invite_token }
}

export async function joinGroupAction(groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  // Verifica se o grupo é público
  const { data: group } = await supabase
    .from('groups')
    .select('visibility')
    .eq('id', groupId)
    .single()

  if (!group) return { error: 'Grupo não encontrado.' }
  if (group.visibility === 'PRIVATE') return { error: 'Grupo privado. Solicite convite ao administrador.' }

  const { error } = await supabase.from('group_members').insert({
    group_id: groupId,
    user_id: user.id,
    role: 'MEMBER',
  })

  if (error) {
    if (error.code === '23505') return { error: 'Você já é membro deste grupo.' }
    return { error: 'Erro ao entrar no grupo.' }
  }

  revalidatePath(`/grupos/${groupId}`)
  return { success: true }
}

export async function leaveGroupAction(groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  // Dono não pode sair (precisa transferir ou excluir)
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  if (membership?.role === 'OWNER') {
    return { error: 'O dono do grupo não pode sair. Transfira a propriedade primeiro.' }
  }

  await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id)

  revalidatePath(`/grupos/${groupId}`)
  revalidatePath('/grupos')
  redirect('/grupos')
}

export async function uploadGroupAvatarAction(formData: FormData): Promise<{ error?: string; avatarUrl?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const groupId = formData.get('groupId') as string | null
  if (!groupId) return { error: 'Grupo inválido.' }

  // Verifica que o usuário é dono do grupo
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()
  if (membership?.role !== 'OWNER') return { error: 'Apenas o dono pode alterar a logo.' }

  const file = formData.get('avatar') as File | null
  if (!file || file.size === 0) return { error: 'Nenhum arquivo selecionado.' }
  if (file.size > 2 * 1024 * 1024) return { error: 'Imagem deve ter no máximo 2MB.' }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return { error: 'Formato inválido. Use JPG, PNG ou WebP.' }
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `groups/${groupId}/avatar.${ext}`

  // Upload usando admin client para contornar RLS do storage
  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: 'Erro ao enviar imagem.' }

  const { data: { publicUrl } } = admin.storage.from('avatars').getPublicUrl(path)
  const avatarUrl = `${publicUrl}?t=${Date.now()}`

  await admin.from('groups').update({ avatar_url: avatarUrl }).eq('id', groupId)

  revalidatePath(`/grupos`)
  revalidatePath(`/grupos/${groupId}`)
  return { avatarUrl }
}

export async function removeMemberAction(groupId: string, memberId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  // Apenas o dono pode remover membros
  const { data: ownership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  if (ownership?.role !== 'OWNER') return { error: 'Apenas o dono pode remover membros.' }
  if (memberId === user.id) return { error: 'Use "sair do grupo" para se remover.' }

  await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', memberId)

  revalidatePath(`/grupos/${groupId}`)
  return { success: true }
}
