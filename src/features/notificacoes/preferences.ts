import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

// Preferências de aviso da pessoa, sem nada de transporte. As colunas não são
// legíveis pela anon key (GRANT por coluna em profiles): o app lê e grava por aqui.

export const preferencesSchema = z
  .object({
    notif_email: z.boolean(),
    notif_push: z.boolean(),
    notif_new_event_channel: z.enum(['EMAIL', 'WHATSAPP', 'NONE']),
  })
  .partial()

export async function getNotificationPreferences(userId: string) {
  const { data } = await createAdminClient()
    .from('profiles')
    .select('notif_email, notif_push, notif_new_event_channel')
    .eq('id', userId)
    .maybeSingle()
  return data
}

export async function setNotificationPreferences(userId: string, input: unknown): Promise<{ error: string } | { success: true }> {
  const parsed = preferencesSchema.safeParse(input)
  if (!parsed.success || Object.keys(parsed.data).length === 0) return { error: 'Preferência inválida.' }

  const { error } = await createAdminClient().from('profiles').update(parsed.data).eq('id', userId)
  if (error) return { error: 'Erro ao salvar preferência.' }

  revalidatePath('/perfil')
  return { success: true }
}
