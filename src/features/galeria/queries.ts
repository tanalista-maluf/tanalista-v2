import { createClient } from '@/lib/supabase/server'

export async function getEventPhotos(eventId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('event_photos')
    .select('id, storage_path, caption, created_at, profiles(full_name, username, avatar_url)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  return data ?? []
}
