import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOrganizerMinNotMet } from '@/lib/emails'

// Vercel Cron: a cada 15 min — verifica eventos que passaram do ponto de mínimo
// Chamado por vercel.json cron schedule
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Eventos OPEN que passaram do min_check_at e ainda não foram marcados como MIN_NOT_MET
  const { data: events } = await admin
    .from('events')
    .select('id, title, min_participants, organizer_id, profiles!events_organizer_id_fkey(full_name)')
    .eq('status', 'OPEN')
    .lte('min_check_at', new Date().toISOString())
    .not('min_check_at', 'is', null)

  if (!events || events.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  let processed = 0

  for (const event of events) {
    const { count } = await admin
      .from('participations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .eq('status', 'CONFIRMED')

    const confirmed = count ?? 0

    if (event.min_participants && confirmed < event.min_participants) {
      // Atualizar status para MIN_NOT_MET
      await admin
        .from('events')
        .update({ status: 'MIN_NOT_MET' })
        .eq('id', event.id)
        .eq('status', 'OPEN') // idempotência

      // E-mail para o organizador
      const { data: authUser } = await admin.auth.admin.getUserById(event.organizer_id)
      if (authUser?.user?.email) {
        sendOrganizerMinNotMet({
          to: authUser.user.email,
          name: (event as any).profiles?.full_name ?? 'Organizador',
          eventTitle: event.title,
          eventId: event.id,
          confirmedCount: confirmed,
          minParticipants: event.min_participants,
        }).catch((e) => console.error('[EMAIL] sendOrganizerMinNotMet:', e))
      }

      processed++
    }
  }

  return NextResponse.json({ processed })
}
