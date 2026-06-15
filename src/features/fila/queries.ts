import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getWaitlistForEvent(eventId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('waitlist_entries')
    .select('*, profiles(username, full_name, avatar_url)')
    .eq('event_id', eventId)
    .in('status', ['WAITING', 'NOTIFIED'])
    .order('position', { ascending: true })

  return data ?? []
}

export async function getUserWaitlistEntry(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('waitlist_entries')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .in('status', ['WAITING', 'NOTIFIED'])
    .maybeSingle()

  return data
}
