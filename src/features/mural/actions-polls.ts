'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createPollAction(
  eventId: string,
  question: string,
  options: string[],
) {
  if (!question.trim() || options.length < 2) return { error: 'Dados inválidos' }
  const cleanOptions = options.map(o => o.trim()).filter(Boolean)
  if (cleanOptions.length < 2) return { error: 'Mínimo 2 opções' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Verifica se é organizador
  const { data: event } = await supabase.from('events').select('organizer_id').eq('id', eventId).single()
  if (!event || event.organizer_id !== user.id) return { error: 'Apenas o organizador pode criar enquetes' }

  const admin = createAdminClient()

  const { data: poll, error: pollErr } = await admin
    .from('event_polls')
    .insert({ event_id: eventId, user_id: user.id, question: question.trim() })
    .select('id')
    .single()

  if (pollErr || !poll) return { error: 'Erro ao criar enquete' }

  const { error: optErr } = await admin
    .from('event_poll_options')
    .insert(cleanOptions.map((text, i) => ({ poll_id: poll.id, text, position: i })))

  if (optErr) return { error: 'Erro ao salvar opções' }

  revalidatePath(`/eventos/${eventId}`)
  return { success: true, pollId: poll.id }
}

export async function voteAction(pollId: string, optionId: string, eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('event_poll_votes')
    .insert({ poll_id: pollId, option_id: optionId, user_id: user.id })

  if (error?.code === '23505') return { error: 'Você já votou nesta enquete' }
  if (error) return { error: 'Erro ao registrar voto' }

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}

export async function deletePollAction(pollId: string, eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const admin = createAdminClient()
  const { error } = await admin.from('event_polls').delete().eq('id', pollId)
  if (error) return { error: 'Erro ao deletar enquete' }

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}
