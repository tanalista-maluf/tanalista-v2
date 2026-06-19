import { createClient } from '@/lib/supabase/server'
import type { GroupRow, GroupMemberRow } from '@/types/database'

const PAGE_SIZE = 20

export type GroupWithMeta = GroupRow & {
  is_member: boolean
  is_owner: boolean
  user_role: 'OWNER' | 'MEMBER' | null
}

export async function getGroups(opts: {
  userId?: string
  q?: string
  city?: string
  category?: string
  cursor_created_at?: string
  cursor_id?: string
  mine?: boolean
}) {
  const supabase = await createClient()

  let query = supabase
    .from('groups')
    .select('*, group_members!inner(user_id, role)')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE + 1)

  if (opts.mine && opts.userId) {
    // Grupos do usuário (qualquer visibilidade)
    query = supabase
      .from('groups')
      .select('*, group_members!inner(user_id, role)')
      .eq('group_members.user_id', opts.userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(PAGE_SIZE + 1)
  }

  if (opts.city) query = query.ilike('city', `%${opts.city}%`)
  if (opts.category) query = query.eq('category', opts.category)

  if (opts.cursor_created_at && opts.cursor_id) {
    query = query.or(
      `created_at.lt.${opts.cursor_created_at},and(created_at.eq.${opts.cursor_created_at},id.lt.${opts.cursor_id})`
    )
  }

  const { data, error } = await query
  if (error) throw error

  const has_more = data.length > PAGE_SIZE
  const rows = has_more ? data.slice(0, PAGE_SIZE) : data
  const last = rows[rows.length - 1]

  return {
    groups: rows as GroupRow[],
    has_more,
    next_cursor: has_more && last ? { created_at: last.created_at, id: last.id } : null,
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getGroupById(slugOrId: string, userId?: string) {
  const supabase = await createClient()

  const isUUID = UUID_RE.test(slugOrId)
  const { data: group, error } = await supabase
    .from('groups')
    .select('*')
    .eq(isUUID ? 'id' : 'slug', slugOrId)
    .maybeSingle()

  if (error || !group) return null

  let membership: GroupMemberRow | null = null
  if (userId) {
    const { data } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', group.id)
      .eq('user_id', userId)
      .maybeSingle()
    membership = data
  }

  return {
    ...(group as GroupRow),
    is_owner: membership?.role === 'OWNER',
    is_member: !!membership,
    user_role: membership?.role ?? null,
  } as GroupWithMeta
}

export async function getGroupMembers(groupId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('group_members')
    .select('*, profiles(id, full_name, username, avatar_url, city)')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true })

  if (error) throw error
  return data ?? []
}
