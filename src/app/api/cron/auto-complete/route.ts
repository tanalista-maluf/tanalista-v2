import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOrganizerEventCompleted } from '@/lib/emails'

// Vercel Cron: hourly — auto-completa eventos encerrados e aciona repasse
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Eventos OPEN ou CLOSED cujo ends_at já passou
  const { data: events } = await admin
    .from('events')
    .select('id, title, organizer_id, price, profiles!events_organizer_id_fkey(full_name)')
    .in('status', ['OPEN', 'CLOSED'])
    .lte('ends_at', new Date().toISOString())

  if (!events || events.length === 0) {
    return NextResponse.json({ completed: 0 })
  }

  let completed = 0

  for (const event of events) {
    const { error } = await admin
      .from('events')
      .update({ status: 'COMPLETED' })
      .eq('id', event.id)
      .in('status', ['OPEN', 'CLOSED'])

    if (error) continue

    // Contar participantes e calcular receita líquida
    const { count } = await admin
      .from('participations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .eq('status', 'CONFIRMED')

    const { data: payments } = await admin
      .from('payments')
      .select('amount, platform_fee, gateway_fee')
      .eq('status', 'APPROVED')
      .in(
        'participation_id',
        admin.from('participations').select('id').eq('event_id', event.id).eq('status', 'CONFIRMED') as any
      )

    const gross      = payments?.reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0
    const platformFees = payments?.reduce((s, p) => s + (p.platform_fee ?? 0), 0) ?? 0
    const gatewayFees  = payments?.reduce((s, p) => s + (p.gateway_fee ?? 0), 0) ?? 0
    const netRevenue   = gross - platformFees - gatewayFees

    // Notificação in-app para o organizador
    await admin.from('notifications').insert({
      user_id: event.organizer_id,
      type: 'EVENT_COMPLETED',
      title: 'Evento concluído!',
      body: `Seu evento "${event.title}" foi concluído. Receita líquida: R$ ${(netRevenue / 100).toFixed(2).replace('.', ',')}.`,
      data: { event_id: event.id },
    })

    // E-mail para o organizador
    const { data: authUser } = await admin.auth.admin.getUserById(event.organizer_id)
    if (authUser?.user?.email) {
      sendOrganizerEventCompleted({
        to: authUser.user.email,
        name: (event as any).profiles?.full_name ?? 'Organizador',
        eventTitle: event.title,
        eventId: event.id,
        participantCount: count ?? 0,
        netRevenue,
      }).catch((e) => console.error('[EMAIL] sendOrganizerEventCompleted:', e))
    }

    completed++
  }

  return NextResponse.json({ completed })
}
