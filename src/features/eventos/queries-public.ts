import { createAdminClient } from '@/lib/supabase/admin'

const PUB_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getPublicEvent(slugOrId: string) {
  const admin = createAdminClient()

  const isUUID = PUB_UUID_RE.test(slugOrId)
  const { data: event, error } = await admin
    .from('events')
    .select(`
      id, slug, title, description, address, city, category, status,
      price, capacity, min_participants, starts_at, ends_at,
      registration_deadline, cover_url, created_at,
      groups(id, name),
      profiles!events_organizer_id_fkey(full_name, username),
      participations(status, profiles(full_name, avatar_url))
    `)
    .eq(isUUID ? 'id' : 'slug', slugOrId)
    .neq('status', 'DRAFT')
    .maybeSingle()

  if (!event) return null

  if (error) return null

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
