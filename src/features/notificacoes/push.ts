'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function subscribePushAction(subscription: {
  endpoint: string
  keys: { p256dh: string; auth: string }
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const admin = createAdminClient()
  const { error } = await admin.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  }, { onConflict: 'user_id,endpoint' })

  if (error) return { error: error.message }
  return {}
}

export async function unsubscribePushAction(endpoint: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const admin = createAdminClient()
  await admin.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint)
}
