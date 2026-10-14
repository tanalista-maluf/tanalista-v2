'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { confirmWaitlistSpot, leaveWaitlist } from './waitlist'

// Sair da fila de espera
export async function leaveWaitlistAction(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  return leaveWaitlist(supabase, user.id, eventId)
}

// Confirmar inscrição a partir da fila (entrada está NOTIFIED)
export async function confirmWaitlistSpotAction(
  eventId: string,
  method: 'PIX' | 'CREDIT_CARD' | 'WALLET'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const result = await confirmWaitlistSpot(supabase, user.id, eventId, method)
  if ('error' in result) return result

  if (result.status === 'CONFIRMED') redirect(`/eventos/${eventId}?joined=1`)
  redirect(`/eventos/${eventId}/pagamento?participation_id=${result.participationId}&method=${method}`)
}
