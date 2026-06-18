import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getParticipants(eventId: string) {
  // Usa admin client para contornar a RLS (participantes de evento público são informação pública)
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('participations')
    .select(`
      id,
      status,
      created_at,
      team_id,
      team_changes_used,
      profiles(id, full_name, username, avatar_url, city)
    `)
    .eq('event_id', eventId)
    .in('status', ['CONFIRMED', 'PENDING'])
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getWaitlist(eventId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('waitlist_entries')
    .select('id, position, status, team_id, profiles(id, full_name, username, avatar_url, city)')
    .eq('event_id', eventId)
    .in('status', ['WAITING', 'NOTIFIED'])
    .order('position', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getUserParticipation(eventId: string, userId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('participations')
    .select('*, payments(id, method, status, amount, gateway_transaction_id)')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle()

  return data
}

export async function getUserParticipations(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('participations')
    .select(`
      *,
      events(id, slug, title, starts_at, city, status, price, cover_url, confirmed_count,
        groups(name),
        participations(status, profiles(full_name, avatar_url)))
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}
