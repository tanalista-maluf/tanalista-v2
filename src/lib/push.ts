import webpush from 'web-push'
import { createAdminClient } from './supabase/admin'

function getWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL ?? 'mailto:contato@tanalista.com.br',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
    process.env.VAPID_PRIVATE_KEY ?? ''
  )
  return webpush
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const admin = createAdminClient()
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, id')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) return

  const results = await Promise.allSettled(
    subs.map(sub =>
      getWebPush().sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      ).catch(async (err) => {
        // 410 Gone = subscription expired, remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await admin.from('push_subscriptions').delete().eq('id', sub.id)
        }
        throw err
      })
    )
  )

  return results
}

export async function sendPushToEventParticipants(eventId: string, payload: PushPayload) {
  const admin = createAdminClient()
  const { data: participants } = await admin
    .from('participations')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('status', 'CONFIRMED')

  if (!participants) return
  await Promise.allSettled(participants.map(p => sendPushToUser(p.user_id, payload)))
}
