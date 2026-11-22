import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { removeEventPhotoFiles } from '@/features/galeria/photos'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: photos, error } = await admin
    .from('event_photos')
    .select('id, storage_key, events!inner(starts_at)')
    .filter('events.starts_at', 'lt', cutoff)

  if (error) {
    console.error('[photos-cleanup]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!photos || photos.length === 0) {
    return NextResponse.json({ deleted: 0 })
  }

  await removeEventPhotoFiles(photos.map(p => p.storage_key))

  const ids = photos.map(p => p.id)
  await admin.from('event_photos').delete().in('id', ids)

  console.log(`[photos-cleanup] deleted ${photos.length} photos`)
  return NextResponse.json({ deleted: photos.length })
}
