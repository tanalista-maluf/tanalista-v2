import { createAdminClient } from '@/lib/supabase/admin'

// Notificação push no app do celular, pelo serviço da Expo (que entrega pelo
// APNs no iOS e pelo FCM no Android). Os tokens ficam em push_tokens,
// registrados pelo app (/api/v1/me/push-token). O push do navegador (site) é
// outro, em push.ts. EXPO_ACCESS_TOKEN é opcional: só é exigido se o projeto na
// Expo ativar "envio seguro".

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

type PushMessage = { title: string; body: string; data?: Record<string, unknown> }
type Ticket = { status: 'ok' | 'error'; details?: { error?: string } }

export async function sendMobilePush(userId: string, message: PushMessage) {
  try {
    const admin = createAdminClient()
    const [{ data: profile }, { data: tokens }] = await Promise.all([
      admin.from('profiles').select('notif_push').eq('id', userId).maybeSingle(),
      admin.from('push_tokens').select('token').eq('user_id', userId),
    ])
    if (!profile?.notif_push || !tokens?.length) return

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(process.env.EXPO_ACCESS_TOKEN && { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }),
      },
      body: JSON.stringify(
        tokens.map(({ token }) => ({
          to: token,
          title: message.title,
          body: message.body,
          data: message.data ?? {},
          sound: 'default',
        }))
      ),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) {
      console.error('[PUSH] send failed:', response.status, await response.text().catch(() => ''))
      return
    }

    // Aparelho que desinstalou o app ou trocou de token: sai da lista
    const { data: tickets } = (await response.json()) as { data?: Ticket[] }
    const stale = (tickets ?? [])
      .map((ticket, index) => (ticket.details?.error === 'DeviceNotRegistered' ? tokens[index].token : null))
      .filter((token): token is string => !!token)
    if (stale.length) await admin.from('push_tokens').delete().in('token', stale)
  } catch (err) {
    // Push é complemento: a notificação no app já foi gravada
    console.error('[PUSH] error:', err)
  }
}

export async function registerPushToken(userId: string, token: string, platform: 'ios' | 'android') {
  const { error } = await createAdminClient()
    .from('push_tokens')
    .upsert({ user_id: userId, token, platform, updated_at: new Date().toISOString() }, { onConflict: 'token' })
  return error ? { error: 'Erro ao registrar o aparelho.' } : { success: true as const }
}

export async function unregisterPushToken(userId: string, token: string) {
  await createAdminClient().from('push_tokens').delete().eq('token', token).eq('user_id', userId)
  return { success: true as const }
}
