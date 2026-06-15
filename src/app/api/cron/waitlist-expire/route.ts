import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'

// Vercel Cron: a cada 15 min
// 1. Expira entradas NOTIFIED cujo expires_at já passou
// 2. Promove o próximo da fila para NOTIFIED
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  // 1. Expirar entradas NOTIFIED vencidas
  const { data: expired } = await admin
    .from('waitlist_entries')
    .select('id, event_id, user_id, position')
    .eq('status', 'NOTIFIED')
    .lte('expires_at', now)

  const expiredIds = (expired ?? []).map((e) => e.id)
  if (expiredIds.length > 0) {
    await admin
      .from('waitlist_entries')
      .update({ status: 'EXPIRED' })
      .in('id', expiredIds)
  }

  // 2. Para cada evento afetado, promover próximo da fila
  const affectedEvents = [...new Set((expired ?? []).map((e) => e.event_id))]
  let promoted = 0

  for (const eventId of affectedEvents) {
    // Verificar se ainda há vagas no evento
    const { data: event } = await admin
      .from('events')
      .select('id, title, capacity, confirmed_count, status')
      .eq('id', eventId)
      .single()

    if (!event || event.status !== 'OPEN') continue

    const spotsLeft = event.capacity - (event.confirmed_count ?? 0)
    if (spotsLeft <= 0) continue

    // Buscar próximo na fila (WAITING, menor position)
    const { data: next } = await admin
      .from('waitlist_entries')
      .select('id, user_id')
      .eq('event_id', eventId)
      .eq('status', 'WAITING')
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!next) continue

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    await admin
      .from('waitlist_entries')
      .update({ status: 'NOTIFIED', notified_at: now, expires_at: expiresAt })
      .eq('id', next.id)

    // Notificação in-app
    await admin.from('notifications').insert({
      user_id: next.user_id,
      type: 'WAITLIST_PROMOTED',
      title: 'Vaga disponível!',
      body: `Uma vaga abriu em "${event.title}". Você tem 24h para confirmar.`,
      data: { event_id: eventId },
    })

    // Push notification
    sendPushToUser(next.user_id, {
      title: 'Vaga disponível! 🎉',
      body: `Uma vaga abriu em "${event.title}". Confirme em 24h.`,
      url: `/eventos/${eventId}`,
    }).catch(() => {})

    promoted++
  }

  return NextResponse.json({
    expired: expiredIds.length,
    promoted,
    affectedEvents: affectedEvents.length,
  })
}
