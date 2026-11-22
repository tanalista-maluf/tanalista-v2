import { createAdminClient } from '@/lib/supabase/admin'

// Apaga os eventos cancelados que nunca tiveram inscrição. Os que tiveram
// ficam: as inscrições guardam pagamentos e estornos (o banco impede apagá-las
// junto com o evento). Só para quem está em ADMIN_EMAILS (a ponte confere).
export async function purgeCancelledEvents(): Promise<{ removed: number; kept: number }> {
  const admin = createAdminClient()

  const { data: cancelled } = await admin.from('events').select('id').eq('status', 'CANCELLED').limit(1000)
  const ids = (cancelled ?? []).map((event) => event.id)
  if (ids.length === 0) return { removed: 0, kept: 0 }

  const withHistory = new Set<string>()
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await admin.from('participations').select('event_id').in('event_id', ids.slice(i, i + 200))
    for (const row of data ?? []) withHistory.add(row.event_id)
  }

  const removable = ids.filter((id) => !withHistory.has(id))
  let removed = 0
  for (let i = 0; i < removable.length; i += 200) {
    const chunk = removable.slice(i, i + 200)
    const { error } = await admin.from('events').delete().in('id', chunk).eq('status', 'CANCELLED')
    if (error) {
      console.error('[ADMIN] purge cancelled events error:', error)
      break
    }
    removed += chunk.length
  }

  return { removed, kept: ids.length - removed }
}
