'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWaitlistNotified } from '@/lib/emails'
import { calculateFees } from '@/lib/mercadopago'

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
    .select('status, price, capacity, organizer_id, organizer_exempt, registration_deadline')
    .eq('id', eventId)
    .single()

  if (!event) return { error: 'Evento não encontrado.' }
  if (event.status !== 'OPEN') return { error: 'Inscrições encerradas.' }
  if (new Date(event.registration_deadline) < new Date()) {
    return { error: 'Prazo de inscrição expirado.' }
  }

  // Verificar se já está inscrito
  const { data: existing } = await supabase
    .from('participations')
    .select('id, status')
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

  // Verificar capacidade
  const { count } = await supabase
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
      await supabase
        .from('participations')
        .update({ status: 'CONFIRMED', payment_id: null, ...(teamId ? { team_id: teamId } : {}) })
        .eq('id', existing.id)
    } else {
      await supabase.from('participations').insert({
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
  const admin = createAdminClient()
  let effectivePrice = event.price
  let appliedCouponId: string | null = null

  if (couponCode && event.price > 0) {
    const normalizedCode = couponCode.trim().toUpperCase()
    const { data: coupon } = await admin
      .from('coupons')
      .select('id, amount_cents, expires_at, max_uses, uses_count')
      .eq('code', normalizedCode)
      .eq('active', true)
      .maybeSingle()

    if (coupon &&
      (!coupon.expires_at || new Date(coupon.expires_at) >= new Date()) &&
      (coupon.max_uses === null || coupon.uses_count < coupon.max_uses)) {
      const { data: alreadyUsed } = await admin
        .from('coupon_uses')
        .select('id')
        .eq('coupon_id', coupon.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!alreadyUsed) {
        effectivePrice = Math.max(0, event.price - coupon.amount_cents)
        appliedCouponId = coupon.id
      }
    }
  }

  // Débito da carteira: confirma imediatamente
  if (method === 'WALLET') {
    // Verificar saldo
    const { data: profile } = await supabase
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
        admin.from('coupon_uses').insert({ coupon_id: appliedCouponId, user_id: user.id }),
        admin.from('coupons').update({ uses_count: (coupon?.uses_count ?? 0) + 1 }).eq('id', appliedCouponId),
      ])
    }

    // Criar/atualizar participação como CONFIRMADA
    let walletParticipationId: string
    if (existing) {
      await admin.from('participations').update({ status: 'CONFIRMED', ...(teamId ? { team_id: teamId } : {}) }).eq('id', existing.id)
      walletParticipationId = existing.id
    } else {
      const { data: created } = await admin.from('participations').insert({
        event_id: eventId,
        user_id: user.id,
        status: 'CONFIRMED',
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
  const discountCents = event.price - effectivePrice
  const couponFields = appliedCouponId
    ? { discount_cents: discountCents, coupon_id: appliedCouponId }
    : {}

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
      admin.from('coupon_uses').insert({ coupon_id: appliedCouponId, user_id: user.id }),
      admin.from('coupons').update({ uses_count: (coupon?.uses_count ?? 0) + 1 }).eq('id', appliedCouponId),
    ])
  }

  revalidatePath(`/eventos/${eventId}`)
  redirect(`/eventos/${eventId}/pagamento?participation_id=${participationId}&method=${method}`)
}

// ── Cancelamento de inscrição ────────────────────────────────────────────────

export async function cancelParticipationAction(
  participationId: string,
  confirmedGatewayFee: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  if (!confirmedGatewayFee) {
    return { error: 'Você deve confirmar o desconto da taxa do gateway.' }
  }

  // Buscar participação com evento
  const { data: participation } = await supabase
    .from('participations')
    .select('*, events(id, starts_at, price, status, organizer_id)')
    .eq('id', participationId)
    .eq('user_id', user.id)
    .single()

  if (!participation) return { error: 'Participação não encontrada.' }

  const event = (participation as any).events
  if (!event) return { error: 'Evento não encontrado.' }

  // Verificar prazo mínimo de 12h
  const hoursUntilEvent = (new Date(event.starts_at).getTime() - Date.now()) / (1000 * 60 * 60)
  const minHours = 12

  if (hoursUntilEvent < minHours && event.organizer_id !== user.id) {
    return {
      error: `Cancelamentos devem ser feitos com pelo menos ${minHours}h de antecedência.`,
      code: 'TOO_LATE',
    }
  }

  if (['CANCELLED', 'COMPLETED'].includes(event.status)) {
    return { error: 'Este evento não permite cancelamento.' }
  }

  const admin = createAdminClient()

  // Cancelar participação
  const { error: cancelError } = await admin
    .from('participations')
    .update({ status: 'CANCELLED' })
    .eq('id', participationId)

  if (cancelError) return { error: 'Erro ao cancelar inscrição.' }

  // Estorno para carteira se era inscrição confirmada paga
  if (participation.status === 'CONFIRMED' && event.price > 0) {
    await admin.rpc('wallet_credit', {
      p_user_id: user.id,
      p_amount: event.price,
      p_type: 'REFUND',
      p_description: `Estorno de inscrição cancelada`,
      p_event_id: event.id,
    })
  }

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
    .select('status')
    .eq('id', eventId)
    .single()

  if (!event || event.status !== 'OPEN') return { error: 'Inscrições encerradas.' }

  // Verificar se já está na fila
  const { data: existingEntry } = await supabase
    .from('waitlist_entries')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .in('status', ['WAITING', 'NOTIFIED'])
    .maybeSingle()

  if (existingEntry) return { error: 'Você já está na fila de espera.' }

  // Obter próxima posição
  const { count: currentCount } = await supabase
    .from('waitlist_entries')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .in('status', ['WAITING', 'NOTIFIED'])

  const position = (currentCount ?? 0) + 1

  const { error } = await supabase.from('waitlist_entries').insert({
    event_id: eventId,
    user_id: user.id,
    position,
    status: 'WAITING',
    ...(teamId ? { team_id: teamId } : {}),
  })

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
    .select('organizer_id, price, title')
    .eq('id', eventId)
    .single()

  if (!event || event.organizer_id !== user.id) return { error: 'Sem permissão.' }

  const admin = createAdminClient()

  // Buscar participação com valor pago e cupom
  const { data: participation } = await admin
    .from('participations')
    .select('user_id, status, discount_cents, coupon_id')
    .eq('id', participationId)
    .eq('event_id', eventId)
    .single()

  if (!participation) return { error: 'Participação não encontrada.' }

  // Reembolso: devolve apenas o valor efetivamente pago (descontando cupom)
  if (participation.status === 'CONFIRMED' && event.price > 0) {
    const refundAmount = Math.max(0, event.price - (participation.discount_cents ?? 0))
    if (refundAmount > 0) {
      await admin.rpc('wallet_credit', {
        p_user_id: participation.user_id,
        p_amount: refundAmount,
        p_type: 'REFUND',
        p_description: `Removido do evento: ${event.title}`,
      })
    }
    // Cupom já utilizado não é devolvido (foi consumido na inscrição)
  }

  // Remover participação
  await admin.from('participations').delete().eq('id', participationId)

  // Notificar participante
  const { createNotificationAdmin } = await import('@/features/notificacoes/actions')
  await createNotificationAdmin({
    userId: participation.user_id,
    type: 'EVENT_CANCELLED',
    title: 'Você foi removido do evento',
    body: `O organizador removeu sua participação em "${event.title}".${event.price > 0 ? ' O valor foi devolvido à sua carteira.' : ''}`,
    data: { event_id: eventId },
  })

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}
