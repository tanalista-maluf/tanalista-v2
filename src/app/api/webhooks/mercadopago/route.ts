import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateMPWebhook } from '@/lib/webhook-validation'
import { getPlatformMPClient, Payment } from '@/lib/mercadopago'
import { sendParticipationConfirmed } from '@/lib/emails'
import type { Json } from '@/types/database'
import { releaseCouponUse } from '@/lib/refunds'
import { confirmWalletDeposit } from '@/features/carteira/wallet'

// Desativar body parser automático (precisamos do rawBody para HMAC)
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // ── 1. Validação HMAC-SHA256 ────────────────────────────────────────────
  const signature  = request.headers.get('x-signature')
  const requestId  = request.headers.get('x-request-id')
  const timestamp  = request.headers.get('x-timestamp') ??
                     signature?.match(/ts=(\d+)/)?.[1] ?? null

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET!

  // ── 2. Parse do body ────────────────────────────────────────────────────
  let event: { type?: string; data?: { id?: string } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const dataId = event.data?.id ?? null
  const admin = createAdminClient()
  const validation = validateMPWebhook(rawBody, signature, requestId, timestamp, secret, dataId)
  if (!validation.valid) {
    console.warn('[WEBHOOK] Invalid signature:', validation.reason)
    try {
      await admin.from('webhook_failures').insert({
        source: 'mercadopago',
        event_type: event.type ?? 'unknown',
        payload: JSON.parse(rawBody),
        error: `Invalid signature: ${validation.reason}`,
      })
    } catch (logErr) {
      console.error('[WEBHOOK] Failed to log signature-failure dead-letter:', logErr)
    }
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Aceita imediatamente para liberar o webhook (MP re-envia se não responder em < 2s)
  // Processamento assíncrono abaixo

  try {
    if (event.type === 'payment') {
      await handlePaymentEvent(event.data?.id, admin)
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[WEBHOOK] Processing error:', errorMsg)
    // Dead-letter: persiste falha no banco para análise e reprocessamento manual
    try {
      await admin.from('webhook_failures').insert({
        source: 'mercadopago',
        event_type: event.type ?? 'unknown',
        payload: JSON.parse(rawBody),
        error: errorMsg,
      })
    } catch (logErr) {
      console.error('[WEBHOOK] Failed to log dead-letter:', logErr)
    }
    // Retorna 200 para evitar re-envio em loop pelo MP
  }

  return NextResponse.json({ received: true })
}

async function handlePaymentEvent(mpPaymentId: string | undefined, admin: ReturnType<typeof createAdminClient>) {
  if (!mpPaymentId) return

  // ── 3. Idempotência: verificar se já processamos ────────────────────────
  const { data: existingPayment } = await admin
    .from('payments')
    .select('id, status, participation_id')
    .eq('gateway_transaction_id', mpPaymentId)
    .maybeSingle()

  // REFUNDED também é final: o app já estornou para a carteira no cancelamento.
  // Reprocessar voltaria o pagamento para APPROVED (o MP continua informando
  // 'approved'), reabrindo o estorno em dobro e a confirmação sem pagamento.
  if (existingPayment?.status === 'APPROVED' || existingPayment?.status === 'REFUNDED') {
    console.log(`[WEBHOOK] Payment ${mpPaymentId} already ${existingPayment.status} — skipping`)
    return
  }

  // ── 4. Buscar detalhes no MP ────────────────────────────────────────────
  const mpClient = getPlatformMPClient()
  const paymentAPI = new Payment(mpClient)

  let mpPayment: Awaited<ReturnType<typeof paymentAPI.get>>
  try {
    mpPayment = await paymentAPI.get({ id: mpPaymentId })
  } catch (err) {
    console.error('[WEBHOOK] Failed to fetch payment from MP:', err)
    return
  }

  const mpStatus = mpPayment.status
  const externalRef = mpPayment.external_reference // = participation_id

  // ── 5. Atualizar registro de payment ────────────────────────────────────
  const newStatus = mapMPStatus(mpStatus)

  if (existingPayment) {
    await admin
      .from('payments')
      .update({
        status: newStatus,
        gateway_response: mpPayment as unknown as Json,
      })
      .eq('id', existingPayment.id)
  } else {
    // Pagamento ainda não registrado (edge case: webhook chegou antes da API response)
    const { data: participation } = await admin
      .from('participations')
      .select('id, user_id, event_id, events(price, organizer_id, mp_access_token)')
      .eq('id', externalRef ?? '')
      .maybeSingle()

    if (!participation) {
      console.warn('[WEBHOOK] No participation found for external_reference:', externalRef)
      return
    }

    const event: any = (participation as any).events
    const method = mpPayment.payment_method_id === 'pix' ? 'PIX' : 'CREDIT_CARD'

    await admin.from('payments').insert({
      participation_id: participation.id,
      payer_id: participation.user_id,
      amount: Math.round((mpPayment.transaction_amount ?? 0) * 100),
      platform_fee: 0,
      gateway_fee: 0,
      method,
      status: newStatus,
      gateway_transaction_id: mpPaymentId,
      gateway_response: mpPayment as unknown as Json,
    })
  }

  // ── 6. Tratar depósito de carteira (external_reference = "deposit:userId:txId") ──
  if (externalRef?.startsWith('deposit:')) {
    const [, userId, txId] = externalRef.split(':')

    if (newStatus === 'APPROVED' && userId && txId) {
      const credited = await confirmWalletDeposit(userId, txId, Math.round((mpPayment.transaction_amount ?? 0) * 100))
      if (credited) console.log(`[WEBHOOK] Wallet deposit for user ${userId} confirmed`)
    }
    return
  }

  // ── 7. Atualizar participação conforme status ────────────────────────────
  if (!externalRef) return

  if (newStatus === 'APPROVED') {
    const { data: updatedParticipation } = await admin
      .from('participations')
      .update({ status: 'CONFIRMED' })
      .eq('id', externalRef)
      .eq('status', 'PENDING')
      .select('user_id, events(id, title, starts_at, city, price)')
      .maybeSingle()

    console.log(`[WEBHOOK] Participation ${externalRef} CONFIRMED`)

    // E-mail de confirmação
    if (updatedParticipation) {
      const ev = (updatedParticipation as any).events
      const { data: profile } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', updatedParticipation.user_id)
        .single()
      const { data: authUser } = await admin.auth.admin.getUserById(updatedParticipation.user_id)

      if (authUser?.user?.email && ev) {
        sendParticipationConfirmed({
          to: authUser.user.email,
          name: profile?.full_name ?? 'Participante',
          eventTitle: ev.title,
          eventDate: ev.starts_at,
          eventCity: ev.city,
          eventId: ev.id,
          price: ev.price,
        }).catch((e) => console.error('[EMAIL] sendParticipationConfirmed:', e))
      }
    }
  }

  // Cartão recusado não cancela a inscrição: ela segue pendente para a pessoa
  // tentar outro cartão ou outro meio de pagamento (como em card-payment.ts)
  const cardRejected = newStatus === 'REJECTED' && mpPayment.payment_method_id !== 'pix'

  if ((newStatus === 'REJECTED' || newStatus === 'CANCELLED') && !cardRejected) {
    // A inscrição cancelada devolve o cupom, como no cancelamento pelo app;
    // senão o uso fica preso e a pessoa não consegue aplicá-lo ao tentar de novo
    const { data: pending } = await admin
      .from('participations')
      .select('user_id, event_id, coupon_id')
      .eq('id', externalRef)
      .eq('status', 'PENDING')
      .maybeSingle()

    await admin
      .from('participations')
      .update({ status: 'CANCELLED', discount_cents: 0, coupon_id: null })
      .eq('id', externalRef)
      .eq('status', 'PENDING')

    if (pending) {
      await releaseCouponUse(admin, { couponId: pending.coupon_id, userId: pending.user_id, eventId: pending.event_id })
    }

    console.log(`[WEBHOOK] Participation ${externalRef} CANCELLED (payment ${newStatus})`)
  }

  if (newStatus === 'REFUNDED') {
    // Crédito na carteira do pagador
    const { data: payment } = await admin
      .from('payments')
      .select('payer_id, amount, gateway_fee')
      .eq('gateway_transaction_id', mpPaymentId)
      .maybeSingle()

    if (payment) {
      // Reembolso descontando taxa do gateway (Doc 15 Adendo 03 P-03)
      const refundAmount = payment.amount - payment.gateway_fee

      if (refundAmount > 0) {
        await admin.rpc('wallet_credit', {
          p_user_id: payment.payer_id,
          p_amount: refundAmount,
          p_type: 'REFUND',
          p_description: 'Reembolso de pagamento cancelado',
        })
      }
    }
  }
}

function mapMPStatus(mpStatus: string | null | undefined): 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED' | 'CANCELLED' {
  switch (mpStatus) {
    case 'approved':    return 'APPROVED'
    case 'rejected':    return 'REJECTED'
    case 'refunded':    return 'REFUNDED'
    case 'cancelled':   return 'CANCELLED'
    case 'charged_back': return 'REFUNDED'
    default:            return 'PENDING'
  }
}
