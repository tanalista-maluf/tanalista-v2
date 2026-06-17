import { createClient } from '@/lib/supabase/server'
import type { EventRow } from '@/types/database'

const PAGE_SIZE = 20

export type EventWithMeta = EventRow & {
  group_name: string
  organizer_name: string
  confirmed_count: number
  waitlist_count: number
  is_organizer: boolean
  user_participation_status: string | null
}

export async function getEvents(opts: {
  userId?: string
  q?: string
  city?: string
  category?: string
  date_from?: string
  date_to?: string
  group_id?: string
  cursor_created_at?: string
  cursor_id?: string
  status?: string[]
  onlyMine?: boolean
}) {
  const supabase = await createClient()

  let query = supabase
    .from('events')
    .select(`
      *,
      groups(name),
      profiles!events_organizer_id_fkey(full_name),
      participations(status)
    `)
    .in('status', opts.status ?? ['OPEN', 'CONFIRMED', 'PENDING'])
    .order('starts_at', { ascending: true })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE + 1)

  if (opts.q) query = query.ilike('title', `%${opts.q}%`)
  if (opts.city) query = query.ilike('city', `%${opts.city}%`)
  if (opts.category) query = query.eq('category', opts.category)
  if (opts.date_from) query = query.gte('starts_at', opts.date_from)
  if (opts.date_to) query = query.lte('starts_at', opts.date_to + 'T23:59:59')
  if (opts.group_id) query = query.eq('group_id', opts.group_id)
  if (opts.onlyMine && opts.userId) query = query.eq('organizer_id', opts.userId)
  // Sem filtro de grupo: só eventos públicos aparecem na listagem geral
  if (!opts.group_id) query = query.eq('visibility', 'PUBLIC')

  if (opts.cursor_created_at && opts.cursor_id) {
    query = query.or(
      `created_at.lt.${opts.cursor_created_at},and(created_at.eq.${opts.cursor_created_at},id.lt.${opts.cursor_id})`
    )
  }

  const { data, error } = await query
  if (error) throw error

  const has_more = data.length > PAGE_SIZE
  const rows = has_more ? data.slice(0, PAGE_SIZE) : data

  return {
    events: rows,
    has_more,
    next_cursor: has_more && rows.length > 0
      ? { created_at: rows[rows.length - 1].created_at, id: rows[rows.length - 1].id }
      : null,
  }
}

const EVENT_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getEventById(slugOrId: string, userId?: string) {
  const supabase = await createClient()

  const isUUID = EVENT_UUID_RE.test(slugOrId)
  const { data: event, error } = await supabase
    .from('events')
    .select(`
      *,
      groups(id, name, owner_id),
      profiles!events_organizer_id_fkey(id, full_name, username)
    `)
    .eq(isUUID ? 'id' : 'slug', slugOrId)
    .maybeSingle()

  if (error || !event) return null

  const id = event.id

  // Contagem de confirmados
  const { count: confirmed_count } = await supabase
    .from('participations')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id)
    .eq('status', 'CONFIRMED')

  // Contagem na fila
  const { count: waitlist_count } = await supabase
    .from('waitlist_entries')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id)
    .eq('status', 'WAITING')

  // Participação do usuário atual
  let user_participation = null
  if (userId) {
    const { data } = await supabase
      .from('participations')
      .select('status, id, checked_in_at, team_id, team_changes_used')
      .eq('event_id', id)
      .eq('user_id', userId)
      .maybeSingle()
    user_participation = data
  }

  // Posição na fila
  let waitlist_position = null
  if (userId) {
    const { data } = await supabase
      .from('waitlist_entries')
      .select('position')
      .eq('event_id', id)
      .eq('user_id', userId)
      .in('status', ['WAITING', 'NOTIFIED'])
      .maybeSingle()
    waitlist_position = data?.position ?? null
  }

  return {
    ...event,
    confirmed_count: confirmed_count ?? 0,
    waitlist_count: waitlist_count ?? 0,
    is_organizer: userId ? event.organizer_id === userId : false,
    user_participation_status: user_participation?.status ?? null,
    user_participation_id: user_participation?.id ?? null,
    user_checked_in_at: (user_participation as any)?.checked_in_at ?? null,
    user_team_id: (user_participation as any)?.team_id ?? null,
    user_team_changes_used: (user_participation as any)?.team_changes_used ?? 0,
    waitlist_position,
  }
}

export async function getOrganizerEvents(organizerId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('*, groups(name), participations(status)')
    .eq('organizer_id', organizerId)
    .order('starts_at', { ascending: true })

  if (error) throw error
  return data ?? []
}
