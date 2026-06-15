import { createAdminClient } from '@/lib/supabase/admin'

export async function getPublicEvent(id: string) {
  const admin = createAdminClient()

  const { data: event, error } = await admin
    .from('events')
    .select(`
      id, title, description, address, city, category, status,
      price, capacity, min_participants, starts_at, ends_at,
      registration_deadline, cover_url, created_at,
      groups(id, name),
      profiles!events_organizer_id_fkey(full_name, username),
      participations(status, profiles(full_name, avatar_url))
    `)
    .eq('id', id)
    .neq('status', 'DRAFT')
    .single()

  if (error || !event) return null

  const participations = (event.participations ?? []) as unknown as Array<{ status: string; profiles: { full_name: string; avatar_url?: string | null } | null }>
  const confirmed = participations.filter(p => p.status === 'CONFIRMED')
  const waitlist = participations.filter(p => p.status === 'WAITLIST')

  const groups = Array.isArray(event.groups) ? event.groups[0] : event.groups
  const profiles = Array.isArray(event.profiles) ? event.profiles[0] : event.profiles

  return {
    ...event,
    confirmed_count: confirmed.length,
    waitlist_count: waitlist.length,
    confirmed_names: confirmed.map(p => p.profiles?.full_name ?? '?').slice(0, 8),
    confirmed_participants: confirmed.slice(0, 8).map(p => ({
      name: p.profiles?.full_name ?? '?',
      avatarUrl: p.profiles?.avatar_url ?? null,
    })),
    groups: groups as { id: string; name: string } | null,
    organizer: profiles as { full_name: string; username: string } | null,
  }
}

export type PublicEvent = NonNullable<Awaited<ReturnType<typeof getPublicEvent>>>
