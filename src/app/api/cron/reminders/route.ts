import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEventReminder } from '@/lib/emails'
import { sendPushToUser } from '@/lib/push'
import { formatDateTime } from '@/utils/format'

async function runReminders() {
  const admin = createAdminClient()
  const now = new Date()

  const from24h = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString()
  const to24h   = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString()

  const { data: events } = await admin
    .from('events')
    .select('id, title, starts_at, address, city')
    .in('status', ['OPEN', 'CONFIRMED'])
    .gte('starts_at', from24h)
    .lte('starts_at', to24h)

  if (!events || events.length === 0) {
    return { sent: 0, skipped: 0, events: 0, message: 'No events in 24h window' }
  }

  let sent = 0
  let skipped = 0

  for (const event of events) {
    const { data: participants } = await admin
      .from('participations')
      .select('user_id')
      .eq('event_id', event.id)
      .eq('status', 'CONFIRMED')

    if (!participants) continue

    for (const p of participants) {
      const { data: alreadySent } = await admin
        .from('email_reminders')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', p.user_id)
        .eq('reminder_type', '24h')
        .maybeSingle()

      if (alreadySent) { skipped++; continue }

      const { data: profile } = await admin
        .from('profiles')
        .select('full_name, notif_email, notif_push')
        .eq('id', p.user_id)
        .single()

      const wantsEmail = profile?.notif_email ?? true
      const wantsPush  = profile?.notif_push  ?? true

      if (!wantsEmail && !wantsPush) { skipped++; continue }

      const { data: authUser } = await admin.auth.admin.getUserById(p.user_id)
      const email = authUser?.user?.email

      try {
        if (wantsEmail && email) {
          await sendEventReminder({
            to: email,
            name: profile?.full_name ?? 'Participante',
            eventTitle: event.title,
            eventDate: event.starts_at,
            eventAddress: event.address,
            eventCity: event.city,
            eventId: event.id,
            hoursUntil: 24,
          })
        }

        await admin.from('email_reminders').insert({
          event_id: event.id,
          user_id: p.user_id,
          reminder_type: '24h',
        })

        if (wantsPush) {
          await sendPushToUser(p.user_id, {
            title: `Lembrete: ${event.title}`,
            body: `Seu evento é amanhã — ${formatDateTime(event.starts_at)}`,
            url: `/eventos/${event.id}`,
          }).catch(() => {})
        }

        sent++
      } catch (e) {
        console.error(`Failed to send reminder:`, e)
      }
    }
  }

  return { sent, skipped, events: events.length }
}

function checkAuth(req: Request) {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

// POST — chamado pelo pg_cron ou Vercel Cron a cada hora
export async function POST(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await runReminders()
  return NextResponse.json(result)
}

// GET — para testar manualmente em dev (também requer auth)
export async function GET(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await runReminders()
  return NextResponse.json(result)
}
