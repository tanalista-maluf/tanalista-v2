import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateFees } from '@/lib/mercadopago'
import { releaseCouponUse, releaseStaleCouponUses } from '@/lib/refunds'
import type { Database } from '@/types/database'
import { getOpenPayment, OPEN_PAYMENT_ERROR } from './card-payment'

// Regra de inscrição em evento, sem nada de transporte: é chamada pela server
// action do site (sessão em cookie) e pela API do app (token Bearer). Recebe o
// cliente Supabase já autenticado como o usuário e devolve o que aconteceu;
// quem chama decide para onde ir.

export type JoinMethod = 'PIX' | 'CREDIT_CARD' | 'WALLET'

export type JoinEventResult =
  | { error: string; code?: 'FULL' | 'INSUFFICIENT_BALANCE' | 'PAYMENT_OPEN' }
  | { status: 'CONFIRMED' }
  | { status: 'PENDING'; participationId: string }

// Em evento privado só entra o organizador ou quem teve o pedido de entrada
// aprovado. A página do evento já esconde o botão de inscrição dos demais, mas
// as ações são chamáveis diretamente.
export async function canJoinPrivateEvent(
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

export async function joinEvent(
  supabase: SupabaseClient<Database>,
  userId: string,
  params: { eventId: string; method: JoinMethod; teamId?: string; couponCode?: string }
): Promise<JoinEventResult> {
  const { eventId, method, teamId, couponCode } = params

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
  if (!(await canJoinPrivateEvent(event, eventId, userId))) {
    return { error: 'Este evento é privado. Solicite a entrada ao organizador.' }
  }

  // Verificar se já está inscrito
  const { data: existing } = await supabase
    .from('participations')
    .select('id, status, coupon_id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'CANCELLED') {
      // Permite re-inscrição após cancelamento
    } else if (existing.status === 'PENDING') {
      // Inscrição aguardando pagamento: dá para refazer o checkout (outro meio
      // de pagamento, outro cupom), desde que não haja cobrança em aberto
      if (await getOpenPayment(existing.id)) return { error: OPEN_PAYMENT_ERROR, code: 'PAYMENT_OPEN' }
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
    await releaseCouponUse(admin, { couponId: existing.coupon_id, userId: userId, eventId })
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
  const isOrganizerExempt = event.organizer_id === userId && event.organizer_exempt

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
        user_id: userId,
        status: 'CONFIRMED',
        ...(teamId ? { team_id: teamId } : {}),
      })
    }
    revalidatePath(`/eventos/${eventId}`)
    return { status: 'CONFIRMED' }
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
      ? await releaseStaleCouponUses(admin, { couponId: coupon.id, userId: userId })
      : 0

    if (coupon &&
      (!coupon.expires_at || new Date(coupon.expires_at) >= new Date()) &&
      (coupon.max_uses === null || coupon.uses_count - released < coupon.max_uses)) {
      // Cupom de grupo vale 1 uso por evento; os demais, 1 uso por usuário
      let usedQuery = admin.from('coupon_uses').select('id').eq('coupon_id', coupon.id).eq('user_id', userId)
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
      .eq('id', userId)
      .single()

    if (!profile || profile.wallet_balance < effectivePrice) {
      return { error: 'Saldo insuficiente na carteira.', code: 'INSUFFICIENT_BALANCE' }
    }

    // Debitar carteira atomicamente
    const { error: debitError } = await admin.rpc('wallet_debit', {
      p_user_id: userId,
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
        admin.from('coupon_uses').insert({ coupon_id: appliedCouponId, user_id: userId, event_id: eventId }),
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
        user_id: userId,
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
        payer_id: userId,
        amount: effectivePrice,
        platform_fee: fees.platform_fee,
        gateway_fee: fees.gateway_fee,
        method: 'WALLET',
        status: 'APPROVED',
      })
    }

    revalidatePath(`/eventos/${eventId}`)
    return { status: 'CONFIRMED' }
  }

  // PIX ou cartão: criar participação PENDING; quem chama leva ao pagamento
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
      .insert({ event_id: eventId, user_id: userId, status: 'PENDING', ...couponFields, ...(teamId ? { team_id: teamId } : {}) })
      .select('id')
      .single()
    participationId = created?.id ?? ''
  }

  if (!participationId) return { error: 'Erro ao criar inscrição.' }

  // Registrar uso do cupom
  if (appliedCouponId) {
    const { data: coupon } = await admin.from('coupons').select('uses_count').eq('id', appliedCouponId).single()
    await Promise.all([
      admin.from('coupon_uses').insert({ coupon_id: appliedCouponId, user_id: userId, event_id: eventId }),
      admin.from('coupons').update({ uses_count: (coupon?.uses_count ?? 0) + 1 }).eq('id', appliedCouponId),
    ])
  }

  revalidatePath(`/eventos/${eventId}`)
  return { status: 'PENDING', participationId }
}
