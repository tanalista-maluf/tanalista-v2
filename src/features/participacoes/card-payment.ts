import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganizerMPClient, getPlatformMPClient, calculateFees, Payment } from '@/lib/mercadopago'
import { sendParticipationConfirmed } from '@/lib/emails'
import type { Json } from '@/types/database'
import { z } from 'zod'
import { getCardPublicKey } from './card-config'

// Cobra no cartão de crédito uma inscrição pendente, sem nada de transporte:
// é chamada pela rota do site (sessão em cookie) e pela API do app (token
// Bearer), como pix-payment.ts. O número do cartão nunca passa por aqui: o
// formulário do Mercado Pago (CardPaymentForm) devolve só um token de uso único.

export const cardPaymentSchema = z.object({
  token: z.string().min(1).max(200),
  payment_method_id: z.string().min(1).max(50),
  issuer_id: z.union([z.string().max(20), z.number()]).optional(),
  // CPF do titular, quando o formulário coleta
  identification: z.object({ type: z.string().max(10).optional(), number: z.string().max(20).optional() }).optional(),
  // Parcelas escolhidas no formulário (inscrição é sempre à vista; recarga aceita parcelar)
  installments: z.number().int().min(1).max(12).optional(),
})

export type CardPaymentInput = z.infer<typeof cardPaymentSchema>

export type CardPaymentResult =
  | { error: string; httpStatus: 400 | 402 | 404 | 500 }
  // in_process: o Mercado Pago ainda está analisando; a confirmação chega pelo webhook
  | { status: 'approved' | 'in_process' }

type CardCharge = { id?: number | string; status?: string; status_detail?: string }

// Fora de produção, MERCADOPAGO_STUB=1 simula a cobrança (ver pix-payment.ts).
// O token 'stub-rejected' simula um cartão recusado.
const useStub = process.env.NODE_ENV !== 'production' && process.env.MERCADOPAGO_STUB === '1'

// O formulário de cartão só funciona com a chave pública do Mercado Pago
export function isCardPaymentEnabled() {
  return useStub || !!getCardPublicKey()
}

export { REJECTION_MESSAGES }

export const OPEN_PAYMENT_ERROR = 'Esta inscrição já tem um pagamento em andamento.'

// Cobrança em aberto de uma inscrição pendente: PIX gerado e ainda não pago,
// ou cartão em análise. Enquanto existir, não se troca o meio de pagamento,
// para a pessoa não pagar duas vezes.
export async function getOpenPayment(participationId: string): Promise<'PIX' | 'CARD_REVIEW' | null> {
  const { data } = await createAdminClient()
    .from('payments')
    .select('method')
    .eq('participation_id', participationId)
    .eq('status', 'PENDING')
    .limit(1)

  const method = data?.[0]?.method
  if (!method) return null
  return method === 'CREDIT_CARD' ? 'CARD_REVIEW' : 'PIX'
}

const REJECTION_MESSAGES: Record<string, string> = {
  cc_rejected_bad_filled_card_number: 'Confira o número do cartão.',
  cc_rejected_bad_filled_date: 'Confira a data de validade.',
  cc_rejected_bad_filled_security_code: 'Confira o código de segurança.',
  cc_rejected_bad_filled_other: 'Confira os dados do cartão.',
  cc_rejected_insufficient_amount: 'Cartão sem limite suficiente.',
  cc_rejected_call_for_authorize: 'O banco pediu autorização. Ligue para o emissor do cartão ou use outro meio.',
  cc_rejected_card_disabled: 'Cartão desabilitado. Ligue para o emissor ou use outro meio.',
  cc_rejected_high_risk: 'Pagamento recusado por segurança. Use outro meio de pagamento.',
  cc_rejected_duplicated_payment: 'Você já fez um pagamento igual a este.',
}

export async function createCardPayment(
  user: { id: string; email?: string },
  participationId: string,
  card: CardPaymentInput
): Promise<CardPaymentResult> {
  if (!isCardPaymentEnabled()) return { error: 'Pagamento com cartão indisponível.', httpStatus: 400 }

  const admin = createAdminClient()

  const { data: participation } = await admin
    .from('participations')
    .select('status, discount_cents, events(id, title, price, starts_at, city, mp_access_token)')
    .eq('id', participationId)
    .eq('user_id', user.id)
    .single()

  if (!participation) return { error: 'Participação não encontrada', httpStatus: 404 }
  if (participation.status !== 'PENDING') return { error: 'Participação não está pendente', httpStatus: 400 }

  const event = participation.events
  if (!event) return { error: 'Evento não encontrado', httpStatus: 404 }

  // Uma cobrança por inscrição: com PIX já gerado ou cartão em análise, uma
  // segunda cobrança poderia ser paga em dobro
  const { data: openPayments } = await admin
    .from('payments')
    .select('id')
    .eq('participation_id', participationId)
    .in('status', ['PENDING', 'APPROVED'])
    .limit(1)

  if (openPayments && openPayments.length > 0) {
    return { error: OPEN_PAYMENT_ERROR, httpStatus: 400 }
  }

  const effectivePrice = Math.max(0, event.price - (participation.discount_cents ?? 0))
  if (effectivePrice <= 0) return { error: 'Esta inscrição não tem valor a pagar.', httpStatus: 400 }

  const fees = calculateFees(effectivePrice, 'CREDIT_CARD')

  let charge: CardCharge
  try {
    if (useStub) {
      const id = `stub-card-${participationId}-${Date.now()}`
      charge =
        card.token === 'stub-rejected'
          ? { id, status: 'rejected', status_detail: 'cc_rejected_insufficient_amount' }
          : { id, status: 'approved', status_detail: 'accredited' }
    } else {
      const mpClient = event.mp_access_token
        ? getOrganizerMPClient(event.mp_access_token)
        : getPlatformMPClient()

      charge = await new Payment(mpClient).create({
        body: {
          transaction_amount: effectivePrice / 100, // MP usa reais, não centavos
          description: `Inscrição: ${event.title}`,
          token: card.token,
          installments: 1,
          payment_method_id: card.payment_method_id,
          ...(card.issuer_id && { issuer_id: Number(card.issuer_id) }),
          payer: {
            email: user.email!,
            ...(card.identification?.number && {
              identification: { type: card.identification.type ?? 'CPF', number: card.identification.number },
            }),
          },
          external_reference: participationId,
          notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
          ...(event.mp_access_token && {
            application_fee: fees.platform_fee / 100,
          }),
        },
        // O token do cartão é de uso único: repetir o envio não cobra de novo
        requestOptions: { idempotencyKey: `card-${participationId}-${card.token}` },
      })
    }
  } catch (err: unknown) {
    console.error('[CARTAO] Error creating payment:', err)
    return { error: 'Não foi possível processar o cartão. Tente novamente.', httpStatus: 500 }
  }

  const status = charge.status === 'approved' ? 'APPROVED' : charge.status === 'rejected' ? 'REJECTED' : 'PENDING'

  const { data: dbPayment, error: insertError } = await admin.from('payments').insert({
    participation_id: participationId,
    payer_id: user.id,
    amount: effectivePrice,
    platform_fee: fees.platform_fee,
    gateway_fee: fees.gateway_fee,
    method: 'CREDIT_CARD',
    status,
    gateway_transaction_id: String(charge.id),
    gateway_response: charge as unknown as Json,
  }).select('id').single()

  if (dbPayment) {
    await admin.from('participations').update({ payment_id: dbPayment.id }).eq('id', participationId)
  } else {
    // A cobrança já existe no Mercado Pago; o webhook registra o pagamento ao notificar
    console.error('[CARTAO] Error recording payment:', String(charge.id), insertError)
  }

  if (status === 'REJECTED') {
    // A inscrição segue pendente: a pessoa tenta outro cartão ou escolhe outro
    // meio de pagamento (join-event.ts aceita refazer o checkout)
    const reason = REJECTION_MESSAGES[charge.status_detail ?? ''] ?? 'Use outro cartão ou outro meio de pagamento.'
    return { error: `Pagamento recusado. ${reason}`, httpStatus: 402 }
  }

  if (status === 'PENDING') return { status: 'in_process' }

  const { data: confirmed } = await admin
    .from('participations')
    .update({ status: 'CONFIRMED' })
    .eq('id', participationId)
    .eq('status', 'PENDING')
    .select('id')
    .maybeSingle()

  // O webhook não manda o e-mail quando encontra o pagamento já aprovado
  if (confirmed && user.email) {
    const { data: profile } = await admin.from('profiles').select('full_name').eq('id', user.id).single()
    sendParticipationConfirmed({
      to: user.email,
      name: profile?.full_name ?? 'Participante',
      eventTitle: event.title,
      eventDate: event.starts_at,
      eventCity: event.city,
      eventId: event.id,
      price: event.price,
    }).catch((e) => console.error('[EMAIL] sendParticipationConfirmed:', e))
  }

  return { status: 'approved' }
}
