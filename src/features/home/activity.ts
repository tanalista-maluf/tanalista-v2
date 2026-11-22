import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'

export type GroupActivity = {
  id: string
  userName: string
  username: string
  avatarUrl: string | null
  eventId: string
  eventTitle: string
  groupName: string
  at: string
}

// "Atividade nos grupos" da tela inicial do app: quem se inscreveu há pouco em
// eventos por vir dos grupos de que a pessoa participa. Mesma consulta da
// página inicial do site.
export async function getGroupActivity(supabase: SupabaseClient<Database>, userId: string): Promise<GroupActivity[]> {
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .limit(10)

  const groupIds = (memberships ?? []).map((row) => row.group_id)
  if (groupIds.length === 0) return []

  const admin = createAdminClient()
  const { data: events } = await admin
    .from('events')
    .select('id')
    .in('group_id', groupIds)
    .gte('starts_at', new Date().toISOString())
    .limit(50)

  const eventIds = (events ?? []).map((row) => row.id)
  if (eventIds.length === 0) return []

  const { data: rows } = await admin
    .from('participations')
    .select('id, created_at, events(id, title, groups(name)), profiles(full_name, username, avatar_url)')
    .neq('user_id', userId)
    .eq('status', 'CONFIRMED')
    .in('event_id', eventIds)
    .order('created_at', { ascending: false })
    .limit(6)

  return (rows ?? []).flatMap((row) =>
    row.events && row.profiles
      ? [
          {
            id: row.id,
            userName: row.profiles.full_name ?? row.profiles.username ?? 'Alguém',
            username: row.profiles.username ?? '',
            avatarUrl: row.profiles.avatar_url,
            eventId: row.events.id,
            eventTitle: row.events.title,
            groupName: row.events.groups?.name ?? '',
            at: row.created_at,
          },
        ]
      : []
  )
}
