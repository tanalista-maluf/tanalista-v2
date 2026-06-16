import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Exclui fotos de eventos cujo ends_at (ou starts_at) foi há mais de 30 dias
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Buscar fotos de eventos que terminaram há mais de 30 dias
  const { data: photos, error } = await admin
    .from('event_photos')
    .select('id, storage_key, events!inner(starts_at, ends_at)')
    .filter('events.starts_at', 'lt', cutoff)

  if (error) {
    console.error('[photos-cleanup] query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!photos || photos.length === 0) {
    return NextResponse.json({ deleted: 0 })
  }

  // Remover do storage
  const keys = photos.map(p => p.storage_key).filter(Boolean) as string[]
  if (keys.length > 0) {
    const { error: storageErr } = await admin.storage.from('event-photos').remove(keys)
    if (storageErr) console.error('[photos-cleanup] storage remove error:', storageErr)
  }

  // Remover do banco
  const ids = photos.map(p => p.id)
  const { error: dbErr } = await admin.from('event_photos').delete().in('id', ids)
  if (dbErr) console.error('[photos-cleanup] db delete error:', dbErr)

  console.log(`[photos-cleanup] deleted ${photos.length} photos from ${photos.length} records`)
  return NextResponse.json({ deleted: photos.length })
}
