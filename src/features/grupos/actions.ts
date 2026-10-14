'use server'

import { redirect } from 'next/navigation'
import { createNotificationAdmin } from '@/features/notificacoes/actions'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createGroup, decideJoinRequest, generateUniqueSlug, joinGroup, leaveGroup } from './membership'
import type { GroupSchema } from './schemas'

export async function createGroupAction(data: GroupSchema): Promise<{ error?: string; groupId?: string; slug?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  return createGroup(supabase, user.id, data)
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

  // Com o service_role: quem ainda não é membro não enxerga um grupo privado
  // pela RLS, e o convite existe justamente para esse caso
  const admin = createAdminClient()
  const { data: group } = await admin
    .from('groups')
    .select('id, name, slug, visibility')
    .eq('invite_token', token)
    .maybeSingle()

  if (!group) return { error: 'Convite inválido ou expirado.', groupId: null, groupSlug: null }

  // Verificar se já é membro
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) return { groupId: group.id, groupSlug: group.slug, alreadyMember: true }

  const { error } = await admin.from('group_members').insert({
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

  return joinGroup(supabase, user.id, groupId)
}

export async function leaveGroupAction(groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const result = await leaveGroup(supabase, user.id, groupId)
  if ('error' in result) return result
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
  if (file.size > 1 * 1024 * 1024) return { error: 'Imagem deve ter no máximo 1MB.' }
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

  const admin = createAdminClient()
  await admin
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', memberId)

  revalidatePath(`/grupos/${groupId}`)
  return { success: true }
}

export async function requestGroupJoinAction(groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('group_join_requests')
    .upsert({ group_id: groupId, user_id: user.id, status: 'PENDING', updated_at: new Date().toISOString() }, { onConflict: 'group_id,user_id' })

  if (error) return { error: 'Erro ao enviar solicitação.' }

  // Notify group owners
  const { data: owners } = await admin
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('role', 'OWNER')

  const { data: requester } = await admin
    .from('profiles')
    .select('full_name, username')
    .eq('id', user.id)
    .maybeSingle()

  const { data: group } = await admin
    .from('groups')
    .select('name, slug')
    .eq('id', groupId)
    .maybeSingle()

  const requesterName = requester?.full_name ?? requester?.username ?? 'Alguém'
  const groupName = group?.name ?? 'grupo'

  for (const owner of owners ?? []) {
    await createNotificationAdmin({
      userId: owner.user_id,
      type: 'GROUP_JOIN_REQUEST',
      title: 'Solicitação de entrada',
      body: `${requesterName} quer entrar no grupo "${groupName}".`,
      data: { group_id: groupId, group_slug: group?.slug, requester_id: user.id },
    })
  }

  revalidatePath(`/grupos/${groupId}`)
  return { success: true }
}

export async function approveGroupJoinRequest(requestId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  return decideJoinRequest(supabase, user.id, requestId, 'APPROVED')
}

export async function rejectGroupJoinRequest(requestId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  return decideJoinRequest(supabase, user.id, requestId, 'REJECTED')
}

export async function transferGroupOwnershipAction(groupId: string, newOwnerUserId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  // Verifica que o usuário atual é OWNER
  const { data: mine } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (mine?.role !== 'OWNER') return { error: 'Apenas o dono pode transferir a liderança.' }

  // Verifica que o novo dono é membro do grupo
  const { data: target } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', newOwnerUserId)
    .maybeSingle()
  if (!target) return { error: 'O usuário selecionado não é membro do grupo.' }

  if (newOwnerUserId === user.id) return { error: 'Você já é o dono do grupo.' }

  const admin = createAdminClient()

  // Numa transação só: troca groups.owner_id, promove o novo dono e o antigo
  // volta a ser membro
  const { error: transferError } = await admin.rpc('transfer_group_ownership', {
    p_group_id: groupId,
    p_current_owner: user.id,
    p_new_owner: newOwnerUserId,
  })
  if (transferError) {
    console.error('[GROUP] transfer_group_ownership error:', groupId, transferError)
    return { error: 'Erro ao transferir liderança. Tente novamente.' }
  }

  // Notifica o novo dono
  const { data: group } = await admin.from('groups').select('name, slug').eq('id', groupId).maybeSingle()
  await createNotificationAdmin({
    userId: newOwnerUserId,
    type: 'GROUP_OWNERSHIP_TRANSFERRED',
    title: 'Você é o novo dono!',
    body: `A liderança do grupo "${group?.name}" foi transferida para você.`,
    data: { group_id: groupId, slug: group?.slug },
  })

  revalidatePath(`/grupos/${group?.slug ?? groupId}`)
  revalidatePath(`/grupos/${group?.slug ?? groupId}/configuracoes`)
  return { }
}

export async function deleteGroupAction(groupId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  // Verifica se é dono
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (membership?.role !== 'OWNER') return { error: 'Apenas o criador pode excluir o grupo.' }

  const admin = createAdminClient()
  const { error } = await admin.from('groups').delete().eq('id', groupId)
  if (error) return { error: 'Erro ao excluir o grupo. Tente novamente.' }

  redirect('/grupos')
}

// ── Aviso do dono do grupo para todos os membros ─────────────────────────────
export async function sendGroupBroadcastAction(groupId: string, message: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const trimmed = message.trim()
  if (!trimmed) return { error: 'Escreva uma mensagem.' }
  if (trimmed.length > 500) return { error: 'Mensagem muito longa (máx. 500 caracteres).' }

  const { data: group } = await supabase
    .from('groups')
    .select('id, name, owner_id')
    .eq('id', groupId)
    .single()

  if (!group || group.owner_id !== user.id) return { error: 'Sem permissão.' }

  const admin = createAdminClient()
  const { data: members } = await admin
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .neq('user_id', user.id)

  if (!members || members.length === 0) {
    return { error: 'Nenhum outro membro para notificar.' }
  }

  const { createNotificationAdmin } = await import('@/features/notificacoes/actions')
  const { sendGroupBroadcastToMember } = await import('@/lib/emails')

  let sent = 0
  await Promise.allSettled(members.map(async (m) => {
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, notif_email')
      .eq('id', m.user_id)
      .single()

    await createNotificationAdmin({
      userId: m.user_id,
      type: 'GROUP_MESSAGE',
      title: `Aviso: ${group.name}`,
      body: trimmed,
      data: { group_id: groupId },
    })


    if (profile?.notif_email ?? true) {
      const { data: authUser } = await admin.auth.admin.getUserById(m.user_id)
      if (authUser?.user?.email) {
        await sendGroupBroadcastToMember({
          to: authUser.user.email,
          name: profile?.full_name ?? 'Participante',
          groupName: group.name,
          groupId,
          message: trimmed,
        }).catch(() => {})
      }
    }

    sent++
  }))

  return { success: true, sent }
}
