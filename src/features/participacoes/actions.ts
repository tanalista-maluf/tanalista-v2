'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWaitlistNotified } from '@/lib/emails'
import { refundParticipationPayments, releaseCouponUse } from '@/lib/refunds'
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

  // Buscar participação com evento (inclui cancel_before_hours)
  const { data: participation } = await supabase
    .from('participations')
    .select('*, events(id, starts_at, price, status, organizer_id, cancel_before_hours, payout_claimed_at)')
    .eq('id', participationId)
    .eq('user_id', user.id)
    .single()

  if (!participation) return { error: 'Participação não encontrada.' }

  const event = (participation as any).events
  if (!event) return { error: 'Evento não encontrado.' }

  // Verificar política de cancelamento do evento
  const hoursUntilEvent = (new Date(event.starts_at).getTime() - Date.now()) / (1000 * 60 * 60)
  const cancelPolicy = event.cancel_before_hours  // null = não permitido, 0 = sempre, N = N horas antes

  if (event.organizer_id !== user.id) {
    if (cancelPolicy === null || cancelPolicy === undefined) {
      return { error: 'Este evento não permite cancelamento pelo participante.', code: 'NOT_ALLOWED' }
    }
    if (cancelPolicy > 0 && hoursUntilEvent < cancelPolicy) {
      return {
        error: `Cancelamentos devem ser feitos com pelo menos ${cancelPolicy}h de antecedência.`,
        code: 'TOO_LATE',
      }
    }
  }

  // Depois do repasse ao organizador, o valor já saiu: estornar pagaria duas vezes
  if (['CANCELLED', 'COMPLETED'].includes(event.status) || event.payout_claimed_at) {
    return { error: 'Este evento não permite cancelamento.' }
  }

  const admin = createAdminClient()

  // Estorno para a carteira do que foi de fato pago (nada, se a inscrição
  // foi gratuita por cupom ou por isenção do organizador). Vem antes de
  // cancelar: se falhar, a inscrição continua como estava e dá para tentar de novo.
  if (participation.status === 'CONFIRMED') {
    const refunded = await refundParticipationPayments(admin, {
      participationId,
      userId: user.id,
      eventId: event.id,
      description: 'Estorno de inscrição cancelada',
    })
    if (refunded === null) return { error: 'Erro ao estornar o pagamento. Tente novamente.' }
  }

  // Cancelar participação
  const { error: cancelError } = await admin
    .from('participations')
    .update({ status: 'CANCELLED', discount_cents: 0, coupon_id: null })
    .eq('id', participationId)

  if (cancelError) {
    console.error('[CANCEL] participation update error after refund:', participationId, cancelError)
    return { error: 'Erro ao cancelar inscrição.' }
  }

  // Um PIX ainda pendente desta inscrição carrega o preço com o desconto do
  // cupom que está sendo devolvido; não pode ser reaproveitado numa reinscrição
  await admin
    .from('payments')
    .update({ status: 'CANCELLED' })
    .eq('participation_id', participationId)
    .eq('status', 'PENDING')

  await releaseCouponUse(admin, { couponId: participation.coupon_id, userId: user.id, eventId: event.id })

  // Promover próximo da fila e enviar e-mail quando uma vaga confirmada é liberada
  if (participation.status === 'CONFIRMED') {
    await admin.rpc('promote_waitlist_next', { p_event_id: event.id })

    // Buscar quem foi promovido para enviar e-mail
    const { data: promoted } = await admin
      .from('waitlist_entries')
      .select('user_id, expires_at, profiles(full_name)')
      .eq('event_id', event.id)
      .eq('status', 'NOTIFIED')
      .order('notified_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (promoted) {
      const { data: authUser } = await admin.auth.admin.getUserById(promoted.user_id)
      if (authUser?.user?.email) {
        sendWaitlistNotified({
          to: authUser.user.email,
          name: (promoted as any).profiles?.full_name ?? 'Participante',
          eventTitle: event.title ?? '',
          eventId: event.id,
          expiresAt: promoted.expires_at ?? '',
        }).catch((e) => console.error('[EMAIL] sendWaitlistNotified:', e))
      }
    }
  }

  revalidatePath(`/eventos/${event.id}`)
  return { success: true }
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
