'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function postCommentAction(eventId: string, content: string) {
  const trimmed = content.trim()
  if (!trimmed || trimmed.length > 500) return { error: 'Mensagem inválida' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('event_comments')
    .insert({ event_id: eventId, user_id: user.id, content: trimmed })

  if (error) return { error: 'Erro ao publicar mensagem' }

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}

export async function deleteCommentAction(commentId: string, eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('event_comments')
    .delete()
    .eq('id', commentId)

  if (error) return { error: 'Erro ao deletar mensagem' }

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}
