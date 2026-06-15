import { createHmac, timingSafeEqual } from 'crypto'

// ── Validação HMAC-SHA256 do webhook do Mercado Pago ────────────────────────
// Doc 15 Adendo 01: timing-safe compare + janela de 5 minutos anti-replay

const REPLAY_WINDOW_MS = 5 * 60 * 1000 // 5 minutos

export interface WebhookValidationResult {
  valid: boolean
  reason?: string
}

export function validateMPWebhook(
  rawBody: string,
  signature: string | null,
  requestId: string | null,
  timestamp: string | null,
  secret: string,
  dataId?: string | null,
): WebhookValidationResult {
  if (!signature || !requestId || !timestamp) {
    return { valid: false, reason: 'Missing signature headers' }
  }

  // Verificar janela de replay (5 minutos)
  const ts = parseInt(timestamp, 10)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > REPLAY_WINDOW_MS / 1000) {
    return { valid: false, reason: 'Timestamp outside replay window' }
  }

  // Extrair hash v1 da assinatura
  // Formato: "ts=<ts>,v1=<hash>"
  const parts = signature.split(',').reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split('=')
    if (k && v) acc[k] = v
    return acc
  }, {})

  const receivedHash = parts['v1']
  if (!receivedHash) return { valid: false, reason: 'Missing v1 in signature' }

  // Construir o payload de assinatura conforme documentação MP:
  // id:<data.id>;request-id:<x-request-id>;ts:<x-timestamp>;
  const manifest = `id:${dataId ?? ''};request-id:${requestId};ts:${timestamp};`
  const expectedHash = createHmac('sha256', secret)
    .update(manifest)
    .digest('hex')

  // Comparação timing-safe
  const expected = Buffer.from(expectedHash, 'hex')
  const received = Buffer.from(receivedHash, 'hex')

  if (expected.length !== received.length) {
    return { valid: false, reason: 'Hash length mismatch' }
  }

  const isValid = timingSafeEqual(expected, received)
  return isValid ? { valid: true } : { valid: false, reason: 'Invalid signature' }
}
