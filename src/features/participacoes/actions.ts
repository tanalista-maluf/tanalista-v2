'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { refundParticipationPayments, releaseCouponUse } from '@/lib/refunds'
import { cancelParticipation } from './cancel-participation'
import { canJoinPrivateEvent, joinEvent, type JoinMethod } from './join-event'

// ── Inscrição no evento ──────────────────────────────────────────────────────

export async function joinEventAction(
  eventId: string,
  method: JoinMethod,
  teamId?: string,
  couponCode?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const result = await joinEvent(supabase, user.id, { eventId, method, teamId, couponCode })
  if ('error' in result) return result

  if (result.status === 'CONFIRMED') redirect(`/eventos/${eventId}?joined=1`)
  redirect(`/eventos/${eventId}/pagamento?participation_id=${result.participationId}&method=${method}`)
}

// ── Cancelamento de inscrição ────────────────────────────────────────────────

export async function cancelParticipationAction(participationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  return cancelParticipation(supabase, user.id, participationId)
}

// ── Entrar na fila de espera ─────────────────────────────────────────────────

export async function joinWaitlistAction(eventId: string, teamId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: event } = await supabase
    .from('events')
    .select('status, organizer_id, visibility')
    .eq('id', eventId)
    .single()

  if (!event || event.status !== 'OPEN') return { error: 'Inscrições encerradas.' }
  if (!(await canJoinPrivateEvent(event, eventId, user.id))) {
    return { error: 'Este evento é privado. Solicite a entrada ao organizador.' }
  }

  const admin = createAdminClient()

  // Verificar se já está na fila. Cada pessoa tem uma única linha por evento
  // (unique), então uma entrada antiga EXPIRED/CONFIRMED é reaproveitada.
  const { data: existingEntry } = await admin
    .from('waitlist_entries')
    .select('id, status')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingEntry && ['WAITING', 'NOTIFIED'].includes(existingEntry.status)) {
    return { error: 'Você já está na fila de espera.' }
  }

  // Próxima posição: depois da maior já usada no evento. Contar só os ativos
  // repetia posições de entradas antigas, e (event_id, position) é unique.
  const { data: last } = await admin
    .from('waitlist_entries')
    .select('position')
    .eq('event_id', eventId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const position = (last?.position ?? 0) + 1
  const entry = {
    position,
    status: 'WAITING' as const,
    notified_at: null,
    expires_at: null,
    team_id: teamId ?? null,
  }

  const { error } = existingEntry
    ? await admin.from('waitlist_entries').update(entry).eq('id', existingEntry.id)
    : await admin.from('waitlist_entries').insert({ event_id: eventId, user_id: user.id, ...entry })

  if (error) return { error: 'Erro ao entrar na fila.' }

  revalidatePath(`/eventos/${eventId}`)
  return { success: true, position }
}

// ── Remover participante (organizador) ────────────────────────────────────────

export async function removeParticipantAction(participationId: string, eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  // Verificar que o user é o organizador
  const { data: event } = await supabase
    .from('events')
    .select('organizer_id, price, title, payout_claimed_at')
    .eq('id', eventId)
    .single()

  if (!event || event.organizer_id !== user.id) return { error: 'Sem permissão.' }

  // Depois do repasse, o valor já foi para o organizador: estornar pagaria duas vezes
  if (event.payout_claimed_at) {
    return { error: 'A receita deste evento já foi resgatada; não é possível remover participantes.' }
  }

  const admin = createAdminClient()

  // Buscar participação com valor pago e cupom
  const { data: participation } = await admin
    .from('participations')
    .select('user_id, status, coupon_id')
    .eq('id', participationId)
    .eq('event_id', eventId)
    .single()

  if (!participation) return { error: 'Participação não encontrada.' }

  // Reembolso: devolve apenas o valor efetivamente pago
  const refundedAmount = participation.status === 'CONFIRMED'
    ? await refundParticipationPayments(admin, {
        participationId,
        userId: participation.user_id,
        eventId,
        description: `Removido do evento: ${event.title}`,
      })
    : 0

  // Sem estorno confirmado a inscrição não é apagada: o pagamento perderia o
  // vínculo com ela e não poderia mais ser devolvido
  if (refundedAmount === null) return { error: 'Erro ao estornar o pagamento. Tente novamente.' }

  await releaseCouponUse(admin, { couponId: participation.coupon_id, userId: participation.user_id, eventId })

  // Remover participação
  await admin.from('participations').delete().eq('id', participationId)

  // Notificar participante
  const { createNotificationAdmin } = await import('@/features/notificacoes/actions')
  await createNotificationAdmin({
    userId: participation.user_id,
    type: 'EVENT_CANCELLED',
    title: 'Você foi removido do evento',
    body: `O organizador removeu sua participação em "${event.title}".${refundedAmount > 0 ? ' O valor pago foi devolvido à sua carteira.' : ''}`,
    data: { event_id: eventId },
  })

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}
