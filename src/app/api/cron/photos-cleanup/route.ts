import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

async function cloudinaryDestroy(publicIds: string[]) {
  if (publicIds.length === 0) return
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
  const apiKey = process.env.CLOUDINARY_API_KEY!
  const apiSecret = process.env.CLOUDINARY_API_SECRET!

  // Cloudinary aceita até 100 public_ids por requisição de delete_resources
  const timestamp = Math.floor(Date.now() / 1000)
  const str = `public_ids[]=${publicIds.join('&public_ids[]=')}&timestamp=${timestamp}${apiSecret}`
  const signature = crypto.createHash('sha1').update(str).digest('hex')

  await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ public_ids: publicIds, api_key: apiKey, timestamp, signature }),
  })
}

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

  const publicIds = photos.map(p => p.storage_key).filter(Boolean) as string[]
  await cloudinaryDestroy(publicIds)

  const ids = photos.map(p => p.id)
  await admin.from('event_photos').delete().in('id', ids)

  console.log(`[photos-cleanup] deleted ${photos.length} photos`)
  return NextResponse.json({ deleted: photos.length })
}
