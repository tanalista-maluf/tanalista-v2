import { createAdminClient } from '@/lib/supabase/admin'
import { getWaitlistForEvent } from '@/features/fila/queries'

// O que o organizador vê na página do próprio evento no app: inscritos com
// check-in e forma de pagamento, pedidos de entrada, fila de espera e o link
// de convite. null se a pessoa não organiza o evento.
export async function getOrganizerEventData(userId: string, eventId: string) {
  const admin = createAdminClient()

  const { data: event } = await admin
    .from('events')
    .select('id, organizer_id, visibility, invite_token, group_id')
    .eq('id', eventId)
    .maybeSingle()

  if (!event || event.organizer_id !== userId) return null

  const [{ data: participants }, { data: requests }, waitlist] = await Promise.all([
    admin
      .from('participations')
      .select('id, status, checked_in_at, created_at, profiles(full_name, username, avatar_url), payments!payments_participation_id_fkey(method, status, amount)')
      .eq('event_id', eventId)
      .in('status', ['CONFIRMED', 'PENDING'])
      .order('created_at', { ascending: true }),
    admin
      .from('event_join_requests')
      .select('id, created_at, profiles(full_name, username, avatar_url)')
      .eq('event_id', eventId)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true }),
    getWaitlistForEvent(eventId),
  ])

  return {
    participants: (participants ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      checkedInAt: row.checked_in_at,
      profile: row.profiles,
      // Forma do pagamento aprovado, se houver
      payment: (row.payments ?? []).find((payment) => payment.status === 'APPROVED') ?? null,
    })),
    joinRequests: (requests ?? []).map((row) => ({ id: row.id, created_at: row.created_at, profile: row.profiles })),
    waitlist: waitlist.map((row) => ({
      id: row.id,
      position: row.position,
      status: row.status,
      profile: row.profiles,
    })),
    inviteToken: event.visibility === 'PRIVATE' ? event.invite_token : null,
  }
}
