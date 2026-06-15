'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createNotificationAdmin(params: {
  userId: string
  type: string
  title: string
  body: string
  data?: Record<string, unknown>
}) {
  const admin = createAdminClient()
  await admin.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    data: params.data ?? {},
    read: false,
  })
}

export async function setNotificationPreferenceAction(
  channel: 'notif_email' | 'notif_push',
  enabled: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ [channel]: enabled })
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/perfil')
  return {}
}

export async function markNotificationReadAction(notificationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  revalidatePath('/notificacoes')
  return { success: true }
}

export async function markAllReadAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)

  revalidatePath('/notificacoes')
  return { success: true }
}
