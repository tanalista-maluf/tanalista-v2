import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganizerMPClient, getPlatformMPClient, calculateFees, Payment } from '@/lib/mercadopago'
import type { Json } from '@/types/database'

// Gera (ou reaproveita) a cobrança PIX de uma inscrição pendente, sem nada de
// transporte: é chamada pela rota do site (sessão em cookie) e pela API do app
// (token Bearer), como join-event.ts.

const PIX_EXPIRATION_MS = 30 * 60 * 1000

export type PixPaymentResult =
  | { error: string; httpStatus: 400 | 404 | 500 }
  | { payment_id: string; qr_code?: string; qr_code_base64?: string; expires_at: string }

type PixTransactionData = { qr_code?: string; qr_code_base64?: string }
type PixCharge = {
  id?: number | string
  date_of_expiration?: string
  point_of_interaction?: { transaction_data?: PixTransactionData }
}

// Fora de produção, MERCADOPAGO_STUB=1 devolve uma cobrança de mentira em vez
// de chamar o Mercado Pago: o teste de ponta a ponta do app roda sem credenciais.
const useStub = process.env.NODE_ENV !== 'production' && process.env.MERCADOPAGO_STUB === '1'

// PNG 1x1, só para a tela ter uma imagem para mostrar
const STUB_QR_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

export async function createPixPayment(
  user: { id: string; email?: string },
  participationId: string
): Promise<PixPaymentResult> {
  const admin = createAdminClient()

  // Buscar participação e evento
  const { data: participation } = await admin
    .from('participations')
    .select('status, discount_cents, events(id, title, price, mp_access_token)')
    .eq('id', participationId)
    .eq('user_id', user.id)
    .single()

  if (!participation) return { error: 'Participação não encontrada', httpStatus: 404 }
  if (participation.status !== 'PENDING') return { error: 'Participação não está pendente', httpStatus: 400 }

  const event = participation.events
  if (!event) return { error: 'Evento não encontrado', httpStatus: 404 }

  // Reutilizar pagamento PIX pendente se já existir
  const { data: existingPayment } = await admin
    .from('payments')
    .select('gateway_transaction_id, gateway_response')
    .eq('participation_id', participationId)
    .eq('status', 'PENDING')
    .eq('method', 'PIX')
    .maybeSingle()

  if (existingPayment?.gateway_response) {
    const charge = existingPayment.gateway_response as PixCharge
    const pixData = charge.point_of_interaction?.transaction_data
    if (pixData?.qr_code) {
      return {
        payment_id: existingPayment.gateway_transaction_id ?? '',
        qr_code: pixData.qr_code,
        qr_code_base64: pixData.qr_code_base64,
        expires_at: charge.date_of_expiration ?? new Date(Date.now() + PIX_EXPIRATION_MS).toISOString(),
      }
    }
  }

  const effectivePrice = Math.max(0, event.price - (participation.discount_cents ?? 0))
  const fees = calculateFees(effectivePrice, 'PIX')
  const expiresAt = new Date(Date.now() + PIX_EXPIRATION_MS).toISOString()

  try {
    let charge: PixCharge

    if (useStub) {
      charge = {
        id: `stub-${participationId}`,
        date_of_expiration: expiresAt,
        point_of_interaction: {
          transaction_data: { qr_code: `00020126-PIX-DE-TESTE-${participationId}`, qr_code_base64: STUB_QR_BASE64 },
        },
      }
    } else {
      // Escolhe client: se o organizador tem token, usa marketplace; senão usa plataforma
      const mpClient = event.mp_access_token
        ? getOrganizerMPClient(event.mp_access_token)
        : getPlatformMPClient()

      charge = await new Payment(mpClient).create({
        body: {
          transaction_amount: effectivePrice / 100, // MP usa reais, não centavos
          description: `Inscrição: ${event.title}`,
          payment_method_id: 'pix',
          payer: {
            email: user.email!,
          },
          // Split: taxa da plataforma (marketplace)
          ...(event.mp_access_token && {
            application_fee: fees.platform_fee / 100,
          }),
          // Idempotência
          external_reference: participationId,
          // Expiração de 30 minutos
          date_of_expiration: expiresAt,
          notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
        },
      })
    }

    const pixData = charge.point_of_interaction?.transaction_data

    // Registrar pagamento no banco
    const { data: dbPayment } = await admin.from('payments').insert({
      participation_id: participationId,
      payer_id: user.id,
      amount: effectivePrice,
      platform_fee: fees.platform_fee,
      gateway_fee: fees.gateway_fee,
      method: 'PIX',
      status: 'PENDING',
      gateway_transaction_id: String(charge.id),
      gateway_response: charge as unknown as Json,
    }).select('id').single()

    // Associar pagamento à participação
    if (dbPayment) {
      await admin
        .from('participations')
        .update({ payment_id: dbPayment.id })
        .eq('id', participationId)
    }

    return {
      payment_id: String(charge.id),
      qr_code: pixData?.qr_code,
      qr_code_base64: pixData?.qr_code_base64,
      expires_at: expiresAt,
    }
  } catch (err: unknown) {
    const error = err as { message?: string }
    console.error('[PIX] Error creating payment:', error)
    return { error: error.message ?? 'Erro ao criar pagamento PIX', httpStatus: 500 }
  }
}
