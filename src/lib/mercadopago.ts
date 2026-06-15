import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'

// ── Cliente da plataforma (para recargas de carteira) ────────────────────────
// Usa as credenciais próprias da plataforma (sem organizer envolvido)
export function getPlatformMPClient() {
  return new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_PLATFORM_ACCESS_TOKEN!,
    options: { timeout: 5000 },
  })
}

// ── Cliente do organizador (para cobranças de evento) ────────────────────────
// Usa o access_token OAuth do organizador + marketplace split
export function getOrganizerMPClient(organizerAccessToken: string) {
  return new MercadoPagoConfig({
    accessToken: organizerAccessToken,
    options: { timeout: 5000 },
  })
}

// ── Cálculo de taxas (Doc 15 Adendo 01 + PLATFORM_CONFIG) ───────────────────

export interface FeeBreakdown {
  gross: number       // valor bruto em centavos
  platform_fee: number
  gateway_fee: number
  net: number         // valor líquido para o organizador
}

export function calculateFees(
  amountCents: number,
  method: 'PIX' | 'CREDIT_CARD' | 'WALLET',
  platformFeePercent = 5,
): FeeBreakdown {
  const gatewayPercent = method === 'PIX' ? 0.99 : method === 'CREDIT_CARD' ? 2.99 : 0

  const platform_fee = Math.round(amountCents * (platformFeePercent / 100))
  const gateway_fee  = Math.round(amountCents * (gatewayPercent / 100))

  return {
    gross: amountCents,
    platform_fee,
    gateway_fee,
    net: amountCents - platform_fee - gateway_fee,
  }
}

// ── Re-exporta classes do SDK para uso nos routes ────────────────────────────
export { Payment, Preference }
