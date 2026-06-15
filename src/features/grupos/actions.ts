'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { GroupSchema } from './schemas'

export async function createGroupAction(data: GroupSchema) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  // Cria o grupo
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      owner_id: user.id,
      name: data.name,
      description: data.description || null,
      visibility: data.visibility,
      category: data.category || null,
      city: data.city,
    })
    .select('id')
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
  redirect(`/grupos/${group.id}`)
}

export async function updateGroupAction(groupId: string, data: GroupSchema) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { error } = await supabase
    .from('groups')
    .update({
      name: data.name,
      description: data.description || null,
      visibility: data.visibility,
      category: data.category || null,
      city: data.city,
    })
    .eq('id', groupId)
    .eq('owner_id', user.id) // RLS garante, mas dupla verificação

  if (error) return { error: 'Erro ao atualizar grupo.' }

  revalidatePath(`/grupos/${groupId}`)
  return { success: true }
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
