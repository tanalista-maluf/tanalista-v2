'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Sair da fila de espera
export async function leaveWaitlistAction(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: entry } = await supabase
    .from('waitlist_entries')
    .select('id, position')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .in('status', ['WAITING', 'NOTIFIED'])
    .maybeSingle()

  if (!entry) return { error: 'Você não está na fila deste evento.' }

  const { error } = await supabase
    .from('waitlist_entries')
    .update({ status: 'CANCELLED' })
    .eq('id', entry.id)

  if (error) return { error: 'Erro ao sair da fila.' }

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}

// Confirmar inscrição a partir da fila (entrada está NOTIFIED)
export async function confirmWaitlistSpotAction(
  eventId: string,
  method: 'PIX' | 'CREDIT_CARD' | 'WALLET'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()

  // Verificar entrada na fila
  const { data: entry } = await supabase
    .from('waitlist_entries')
    .select('id, status, expires_at')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .eq('status', 'NOTIFIED')
    .maybeSingle()

  if (!entry) return { error: 'Você não tem uma vaga reservada neste evento.' }

  if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
    return { error: 'Sua reserva expirou. Você foi removido da fila.' }
  }

  const { data: event } = await supabase
    .from('events')
    .select('price, organizer_id, organizer_exempt, status')
    .eq('id', eventId)
    .single()

  if (!event || event.status !== 'OPEN') return { error: 'Evento não disponível.' }

  const isExempt = event.organizer_id === user.id && event.organizer_exempt

  if (isExempt || event.price === 0) {
    await admin.from('participations').insert({
      event_id: eventId,
      user_id: user.id,
      status: 'CONFIRMED',
    })
    await admin.from('waitlist_entries').update({ status: 'CONFIRMED' }).eq('id', entry.id)
    revalidatePath(`/eventos/${eventId}`)
    redirect(`/eventos/${eventId}?joined=1`)
  }

  if (method === 'WALLET') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single()

    if (!profile || profile.wallet_balance < event.price) {
      return { error: 'Saldo insuficiente na carteira.', code: 'INSUFFICIENT_BALANCE' }
    }

    const { error: debitError } = await admin.rpc('wallet_debit', {
      p_user_id: user.id,
      p_amount: event.price,
      p_type: 'PAYMENT',
      p_description: 'Inscrição via fila de espera',
      p_event_id: eventId,
    })

    if (debitError) return { error: 'Erro ao processar pagamento pela carteira.' }

    await admin.from('participations').insert({
      event_id: eventId,
      user_id: user.id,
      status: 'CONFIRMED',
    })
    await admin.from('waitlist_entries').update({ status: 'CONFIRMED' }).eq('id', entry.id)

    revalidatePath(`/eventos/${eventId}`)
    redirect(`/eventos/${eventId}?joined=1`)
  }

  // PIX ou cartão: criar participação PENDING
  const { data: created } = await admin
    .from('participations')
    .insert({ event_id: eventId, user_id: user.id, status: 'PENDING' })
    .select('id')
    .single()

  if (!created) return { error: 'Erro ao criar inscrição.' }

  // Marcar fila como CONFIRMED (o pagamento ainda não foi feito, mas a vaga foi reservada)
  await admin.from('waitlist_entries').update({ status: 'CONFIRMED' }).eq('id', entry.id)

  revalidatePath(`/eventos/${eventId}`)
  redirect(`/eventos/${eventId}/pagamento?participation_id=${created.id}&method=${method}`)
}
