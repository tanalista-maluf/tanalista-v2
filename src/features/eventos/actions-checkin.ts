'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function checkInAction(eventId: string, participationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  const admin = createAdminClient()

  // Verifica se o usuário é organizador do evento
  const { data: event } = await admin
    .from('events')
    .select('organizer_id')
    .eq('id', eventId)
    .single()

  if (!event || event.organizer_id !== user.id) {
    return { success: false, error: 'Apenas o organizador pode fazer check-in' }
  }

  // Busca a participação
  const { data: participation } = await admin
    .from('participations')
    .select('id, status, checked_in_at, profiles(full_name, username, avatar_url)')
    .eq('id', participationId)
    .eq('event_id', eventId)
    .single()

  if (!participation) {
    return { success: false, error: 'Participação não encontrada neste evento' }
  }

  if (participation.status !== 'CONFIRMED') {
    return { success: false, error: 'Participante não está confirmado' }
  }

  const profile = Array.isArray(participation.profiles)
    ? participation.profiles[0]
    : participation.profiles as { full_name: string; username: string; avatar_url: string | null } | null

  // Já fez check-in
  if (participation.checked_in_at) {
    return {
      success: true,
      alreadyCheckedIn: true,
      name: profile?.full_name,
      username: profile?.username,
      avatarUrl: profile?.avatar_url,
    }
  }

  // Marca check-in
  const { error } = await admin
    .from('participations')
    .update({ checked_in_at: new Date().toISOString() })
    .eq('id', participationId)

  if (error) return { success: false, error: 'Erro ao registrar check-in' }

  return {
    success: true,
    alreadyCheckedIn: false,
    name: profile?.full_name,
    username: profile?.username,
    avatarUrl: profile?.avatar_url,
  }
}
