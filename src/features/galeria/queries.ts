import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getEventPhotos(eventId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('event_photos')
    .select('id, storage_path, file_size, created_at, profiles(full_name, username, avatar_url)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getEventStorageUsage(eventId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('event_photos')
    .select('file_size')
    .eq('event_id', eventId)

  const usedBytes = (data ?? []).reduce((sum, r) => sum + (r.file_size ?? 0), 0)
  const limitBytes = 100 * 1024 * 1024
  return {
    usedBytes,
    usedMB: +(usedBytes / 1024 / 1024).toFixed(1),
    limitMB: 100,
    percent: Math.min(100, Math.round((usedBytes / limitBytes) * 100)),
  }
}
