import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tanalista.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient()

  // Public events (non-DRAFT, non-CANCELLED, future or recent)
  const { data: events } = await admin
    .from('events')
    .select('slug, id, starts_at, updated_at')
    .in('status', ['OPEN', 'CONFIRMED', 'PENDING', 'COMPLETED'])
    .gte('starts_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // last 30 days
    .order('starts_at', { ascending: false })
    .limit(500)

  const eventUrls: MetadataRoute.Sitemap = (events ?? []).map(e => ({
    url: `${BASE}/e/${e.slug ?? e.id}`,
    lastModified: e.updated_at ? new Date(e.updated_at) : new Date(e.starts_at),
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  return [
    { url: BASE, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/cadastro`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ...eventUrls,
  ]
}
