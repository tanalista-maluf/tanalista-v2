import { createAdminClient } from '@/lib/supabase/admin'

const PUB_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getPublicGroup(slugOrId: string) {
  const admin = createAdminClient()
  const isUUID = PUB_UUID_RE.test(slugOrId)

  const { data: group, error } = await admin
    .from('groups')
    .select('id, slug, name, description, city, category, avatar_url, visibility, member_count, created_at')
    .eq(isUUID ? 'id' : 'slug', slugOrId)
    .maybeSingle()

  if (!group || error) return null

  const { data: events } = await admin
    .from('events')
    .select('id, slug, title, starts_at, price, cover_url')
    .eq('group_id', group.id)
    .in('status', ['OPEN', 'CONFIRMED', 'PENDING'])
    .order('starts_at', { ascending: true })
    .limit(5)

  return { ...group, upcoming_events: events ?? [] }
}

export type PublicGroup = NonNullable<Awaited<ReturnType<typeof getPublicGroup>>>
