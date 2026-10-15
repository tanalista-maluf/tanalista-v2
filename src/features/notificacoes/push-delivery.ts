import { sendMobilePush } from '@/lib/mobile-push'
import { sendPushToUser } from '@/lib/push'
import { createAdminClient } from '@/lib/supabase/admin'

type PushContent = { user_id: string; title: string; body: string; data: unknown }

// Manda como push (app do celular e navegador) uma notificação já gravada.
// Chamado por createNotificationAdmin logo depois de gravar e pelo endpoint
// /api/notificacoes/push, que o banco aciona a cada notificação nova (ver a
// migration 20261019000002). Marcar pushed_at é a "reivindicação": só quem
// consegue marcar envia, então o push sai uma vez só.
//
// fallback: o conteúdo, para quem acabou de gravar. Se a marcação falhar (por
// exemplo, antes da migration que cria pushed_at), envia mesmo assim.
export async function deliverNotificationPush(notificationId: string, fallback?: PushContent): Promise<void> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()

  const { data: claimed, error } = await admin
    .from('notifications')
    .update({ pushed_at: new Date().toISOString() })
    .eq('id', notificationId)
    .is('pushed_at', null)
    .gte('created_at', since)
    .select('user_id, title, body, data')
    .maybeSingle()

  const target = error ? fallback : claimed
  if (!target) return
  await sendPush(target)
}

async function sendPush(claimed: PushContent) {
  const admin = createAdminClient()
  const data = (claimed.data ?? {}) as Record<string, unknown>
  const url =
    typeof data.event_id === 'string'
      ? `/eventos/${data.event_id}`
      : typeof data.group_id === 'string'
        ? `/grupos/${data.group_id}`
        : '/notificacoes'

  // sendMobilePush já respeita a preferência notif_push
  const { data: profile } = await admin.from('profiles').select('notif_push').eq('id', claimed.user_id).maybeSingle()
  await Promise.allSettled([
    sendMobilePush(claimed.user_id, { title: claimed.title, body: claimed.body, data }),
    profile?.notif_push === false
      ? Promise.resolve()
      : sendPushToUser(claimed.user_id, { title: claimed.title, body: claimed.body, url }),
  ])
}
