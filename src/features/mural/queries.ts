import { createAdminClient } from '@/lib/supabase/admin'

export interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: {
    full_name: string
    username: string
    avatar_url: string | null
  } | null
}

export async function getEventComments(eventId: string): Promise<Comment[]> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('event_comments')
    .select('id, content, created_at, user_id, profiles(full_name, username, avatar_url)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) return []

  return (data ?? []).map(row => ({
    ...row,
    profiles: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
  })) as Comment[]
}
