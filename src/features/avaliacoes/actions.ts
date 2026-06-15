'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function submitRatingAction(
  eventId: string,
  rating: number,
  comment: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  if (rating < 1 || rating > 5) return { error: 'Avaliação inválida' }

  const admin = createAdminClient()

  // Verify participant is confirmed and event is FINISHED
  const { data: participation } = await admin
    .from('participations')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .eq('status', 'CONFIRMED')
    .single()

  if (!participation) return { error: 'Apenas participantes confirmados podem avaliar' }

  const { data: event } = await admin
    .from('events')
    .select('status')
    .eq('id', eventId)
    .single()

  if (!event || event.status !== 'COMPLETED') return { error: 'O evento precisa ter terminado para ser avaliado' }

  const { error } = await admin
    .from('event_ratings')
    .upsert({
      event_id: eventId,
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
    }, { onConflict: 'event_id,user_id' })

  if (error) return { error: error.message }

  revalidatePath(`/eventos/${eventId}`)
  return {}
}

export async function getEventRatingSummary(eventId: string) {
  const admin = createAdminClient()

  const { data } = await admin
    .from('event_ratings')
    .select('rating, comment, created_at, profiles(full_name, username, avatar_url)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (!data) return { average: 0, count: 0, ratings: [] }

  const count = data.length
  const average = count > 0
    ? Math.round((data.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
    : 0

  return { average, count, ratings: data }
}

export async function getUserRating(eventId: string, userId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('event_ratings')
    .select('rating, comment')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single()
  return data
}
