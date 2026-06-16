import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateMPWebhook } from '@/lib/webhook-validation'
import { getPlatformMPClient, Payment } from '@/lib/mercadopago'
import { sendParticipationConfirmed } from '@/lib/emails'

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
  const validation = validateMPWebhook(rawBody, signature, requestId, timestamp, secret, dataId)
  if (!validation.valid) {
    console.warn('[WEBHOOK] Invalid signature:', validation.reason)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Aceita imediatamente para liberar o webhook (MP re-envia se não responder em < 2s)
  // Processamento assíncrono abaixo
  const admin = createAdminClient()

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

  if (existingPayment?.status === 'APPROVED') {
    console.log(`[WEBHOOK] Payment ${mpPaymentId} already approved — skipping`)
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
        gateway_response: mpPayment as unknown as Record<string, unknown>,
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
      gateway_response: mpPayment as unknown as Record<string, unknown>,
    })
  }

  // ── 6. Tratar depósito de carteira (external_reference = "deposit:userId:txId") ──
  if (externalRef?.startsWith('deposit:')) {
    const [, userId, txId] = externalRef.split(':')

    if (newStatus === 'APPROVED' && userId && txId) {
      // Validar valor contra o registro original do banco (evita creditar valor manipulado)
      const { data: pendingTx } = await admin
        .from('wallet_transactions')
        .select('amount')
        .eq('id', txId)
        .eq('user_id', userId)
        .single()

      if (!pendingTx) {
        console.warn(`[WEBHOOK] Deposit tx ${txId} not found or already processed`)
        return
      }

      const mpAmountCents = Math.round((mpPayment.transaction_amount ?? 0) * 100)
      if (Math.abs(mpAmountCents - pendingTx.amount) > 1) {
        console.error(`[WEBHOOK] Deposit amount mismatch: MP=${mpAmountCents} DB=${pendingTx.amount} — aborting`)
        return
      }

      // Creditar saldo atomicamente via RPC usando valor do banco
      await admin.rpc('wallet_credit', {
        p_user_id: userId,
        p_amount: pendingTx.amount,
        p_type: 'DEPOSIT',
        p_description: 'Recarga de carteira via PIX',
      })

      await admin.from('wallet_transactions').delete().eq('id', txId)
      console.log(`[WEBHOOK] Wallet deposit for user ${userId} confirmed: ${pendingTx.amount}`)
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

  if (newStatus === 'REJECTED' || newStatus === 'CANCELLED') {
    await admin
      .from('participations')
      .update({ status: 'CANCELLED' })
      .eq('id', externalRef)
      .eq('status', 'PENDING')

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
