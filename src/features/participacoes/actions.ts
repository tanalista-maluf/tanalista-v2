'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWaitlistNotified } from '@/lib/emails'
import { calculateFees } from '@/lib/mercadopago'
import { refundParticipationPayments, releaseCouponUse, releaseStaleCouponUses } from '@/lib/refunds'

// Em evento privado só entra o organizador ou quem teve o pedido de entrada
// aprovado. A página do evento já esconde o botão de inscrição dos demais, mas
// as ações são chamáveis diretamente.
async function canJoinPrivateEvent(
  event: { visibility: string; organizer_id: string },
  eventId: string,
  userId: string
): Promise<boolean> {
  if (event.visibility !== 'PRIVATE' || event.organizer_id === userId) return true

  const admin = createAdminClient()
  const { data: request } = await admin
    .from('event_join_requests')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle()

  return request?.status === 'APPROVED'
}

// ── Inscrição no evento ──────────────────────────────────────────────────────

export async function joinEventAction(
  eventId: string,
  method: 'PIX' | 'CREDIT_CARD' | 'WALLET',
  teamId?: string,
  couponCode?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  // Buscar evento
  const { data: event } = await supabase
    .from('events')
    .select('status, price, capacity, organizer_id, organizer_exempt, registration_deadline, group_id, visibility')
    .eq('id', eventId)
    .single()

  if (!event) return { error: 'Evento não encontrado.' }
  if (event.status !== 'OPEN') return { error: 'Inscrições encerradas.' }
  if (new Date(event.registration_deadline) < new Date()) {
    return { error: 'Prazo de inscrição expirado.' }
  }
  if (!(await canJoinPrivateEvent(event, eventId, user.id))) {
    return { error: 'Este evento é privado. Solicite a entrada ao organizador.' }
  }

  // Verificar se já está inscrito
  const { data: existing } = await supabase
    .from('participations')
    .select('id, status, coupon_id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'CANCELLED') {
      // Permite re-inscrição após cancelamento
    } else {
      return { error: 'Você já está inscrito neste evento.' }
    }
  }

  // Toda escrita em participations passa pelo service_role: anon/authenticated
  // não têm INSERT/UPDATE na tabela, senão o usuário se confirmaria sem pagar.
  const admin = createAdminClient()

  // Uma inscrição cancelada por um caminho que não devolve o cupom (ex.: PIX
  // expirado, via webhook) ainda segura o uso; devolve antes de validar o novo
  if (existing?.coupon_id) {
    await releaseCouponUse(admin, { couponId: existing.coupon_id, userId: user.id, eventId })
  }

  // Verificar capacidade. Conta com o service_role: pelo cliente do usuário a
  // RLS só devolve as inscrições dele (ou as do evento que organiza), e a
  // contagem ficaria abaixo do real.
  const { count } = await admin
    .from('participations')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('status', 'CONFIRMED')

  if ((count ?? 0) >= event.capacity) {
    return { error: 'Evento lotado. Tente a fila de espera.', code: 'FULL' }
  }

  // Organizador isento: confirma diretamente
  const isOrganizerExempt = event.organizer_id === user.id && event.organizer_exempt

  if (isOrganizerExempt || event.price === 0) {
    // Confirmar diretamente sem pagamento
    if (existing) {
      await admin
        .from('participations')
        .update({ status: 'CONFIRMED', payment_id: null, discount_cents: 0, coupon_id: null, ...(teamId ? { team_id: teamId } : {}) })
        .eq('id', existing.id)
    } else {
      await admin.from('participations').insert({
        event_id: eventId,
        user_id: user.id,
        status: 'CONFIRMED',
        ...(teamId ? { team_id: teamId } : {}),
      })
    }
    revalidatePath(`/eventos/${eventId}`)
    redirect(`/eventos/${eventId}?joined=1`)
  }

  // Aplicar cupom de desconto se fornecido
  let effectivePrice = event.price
  let appliedCouponId: string | null = null

  if (couponCode && event.price > 0) {
    const normalizedCode = couponCode.trim().toUpperCase()
    const scopeFilter = event.group_id
      ? `event_id.eq.${eventId},group_id.eq.${event.group_id},and(event_id.is.null,group_id.is.null)`
      : `event_id.eq.${eventId},and(event_id.is.null,group_id.is.null)`
    const { data: coupon } = await admin
      .from('coupons')
      .select('id, amount_cents, percent_off, expires_at, max_uses, uses_count, group_id')
      .eq('code', normalizedCode)
      .eq('active', true)
      .or(scopeFilter)
      .maybeSingle()

    const released = coupon
      ? await releaseStaleCouponUses(admin, { couponId: coupon.id, userId: user.id })
      : 0

    if (coupon &&
      (!coupon.expires_at || new Date(coupon.expires_at) >= new Date()) &&
      (coupon.max_uses === null || coupon.uses_count - released < coupon.max_uses)) {
      // Cupom de grupo vale 1 uso por evento; os demais, 1 uso por usuário
      let usedQuery = admin.from('coupon_uses').select('id').eq('coupon_id', coupon.id).eq('user_id', user.id)
      if (coupon.group_id) usedQuery = usedQuery.eq('event_id', eventId)
      const { data: alreadyUsed } = await usedQuery.limit(1).maybeSingle()

      if (!alreadyUsed) {
        const discount = coupon.percent_off != null
          ? Math.round(event.price * (coupon.percent_off / 100))
          : coupon.amount_cents
        effectivePrice = Math.max(0, event.price - discount)
        appliedCouponId = coupon.id
      }
    }
  }

  // Registra o desconto aplicado na própria participação — necessário para
  // que um eventual reembolso (removeParticipantAction/cancelParticipationAction)
  // calcule o valor a devolver com base no que foi de fato pago, não no preço cheio.
  // Gravado sempre, também zerado: a linha de participations é reaproveitada
  // numa reinscrição e não pode herdar o desconto da inscrição anterior.
  const discountCents = event.price - effectivePrice
  const couponFields = { discount_cents: discountCents, coupon_id: appliedCouponId }

  // Débito da carteira: confirma imediatamente
  if (method === 'WALLET') {
    // Verificar saldo
    const { data: profile } = await admin
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single()

    if (!profile || profile.wallet_balance < effectivePrice) {
      return { error: 'Saldo insuficiente na carteira.', code: 'INSUFFICIENT_BALANCE' }
    }

    // Debitar carteira atomicamente
    const { error: debitError } = await admin.rpc('wallet_debit', {
      p_user_id: user.id,
      p_amount: effectivePrice,
      p_type: 'PAYMENT',
      p_description: `Inscrição no evento`,
      p_event_id: eventId,
    })

    if (debitError) return { error: 'Erro ao processar pagamento pela carteira.' }

    // Registrar uso do cupom
    if (appliedCouponId) {
      const { data: coupon } = await admin.from('coupons').select('uses_count').eq('id', appliedCouponId).single()
      await Promise.all([
        admin.from('coupon_uses').insert({ coupon_id: appliedCouponId, user_id: user.id, event_id: eventId }),
        admin.from('coupons').update({ uses_count: (coupon?.uses_count ?? 0) + 1 }).eq('id', appliedCouponId),
      ])
    }

    // Criar/atualizar participação como CONFIRMADA
    let walletParticipationId: string
    if (existing) {
      await admin.from('participations').update({ status: 'CONFIRMED', ...couponFields, ...(teamId ? { team_id: teamId } : {}) }).eq('id', existing.id)
      walletParticipationId = existing.id
    } else {
      const { data: created } = await admin.from('participations').insert({
        event_id: eventId,
        user_id: user.id,
        status: 'CONFIRMED',
        ...couponFields,
        ...(teamId ? { team_id: teamId } : {}),
      }).select('id').single()
      walletParticipationId = created?.id ?? ''
    }

    // Registrar pagamento na tabela payments para incluir no repasse ao organizador
    // gateway_fee = 0.99% (mesmo que PIX — plataforma recupera custo do depósito)
    if (walletParticipationId && effectivePrice > 0) {
      const fees = calculateFees(effectivePrice, 'WALLET')
      await admin.from('payments').insert({
        participation_id: walletParticipationId,
        payer_id: user.id,
        amount: effectivePrice,
        platform_fee: fees.platform_fee,
        gateway_fee: fees.gateway_fee,
        method: 'WALLET',
        status: 'APPROVED',
      })
    }

    revalidatePath(`/eventos/${eventId}`)
    redirect(`/eventos/${eventId}?joined=1`)
  }

  // PIX ou cartão: criar participação PENDING e redirecionar para pagamento
  let participationId: string

  if (existing) {
    const { data: updated } = await admin
      .from('participations')
      .update({ status: 'PENDING', ...couponFields, ...(teamId ? { team_id: teamId } : {}) })
      .eq('id', existing.id)
      .select('id')
      .single()
    participationId = updated?.id ?? existing.id
  } else {
    const { data: created } = await admin
      .from('participations')
      .insert({ event_id: eventId, user_id: user.id, status: 'PENDING', ...couponFields, ...(teamId ? { team_id: teamId } : {}) })
      .select('id')
      .single()
    participationId = created?.id ?? ''
  }

  if (!participationId) return { error: 'Erro ao criar inscrição.' }

  // Registrar uso do cupom
  if (appliedCouponId) {
    const { data: coupon } = await admin.from('coupons').select('uses_count').eq('id', appliedCouponId).single()
    await Promise.all([
      admin.from('coupon_uses').insert({ coupon_id: appliedCouponId, user_id: user.id, event_id: eventId }),
      admin.from('coupons').update({ uses_count: (coupon?.uses_count ?? 0) + 1 }).eq('id', appliedCouponId),
    ])
  }

  revalidatePath(`/eventos/${eventId}`)
  redirect(`/eventos/${eventId}/pagamento?participation_id=${participationId}&method=${method}`)
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
