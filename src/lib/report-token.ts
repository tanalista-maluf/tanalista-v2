import { createHmac, timingSafeEqual } from 'crypto'

// Link de relatório aberto pelo app mobile no navegador do sistema
// (expo-web-browser não manda cabeçalho Authorization numa navegação, só em
// fetch): em vez do token de sessão do Supabase, assina um token próprio,
// de curtíssima duração e restrito a um evento + organizador específicos —
// se vazar (log, histórico do navegador), o estrago é mínimo.
const TTL_MS = 5 * 60 * 1000

function secret(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY!
}

export function signReportToken(eventId: string, userId: string): string {
  const payload = `${eventId}:${userId}:${Date.now() + TTL_MS}`
  const payloadB64 = Buffer.from(payload).toString('base64url')
  const sig = createHmac('sha256', secret()).update(payloadB64).digest('base64url')
  return `${payloadB64}.${sig}`
}

export function verifyReportToken(token: string, eventId: string): { userId: string } | null {
  const [payloadB64, sig] = token.split('.')
  if (!payloadB64 || !sig) return null

  const expectedSig = createHmac('sha256', secret()).update(payloadB64).digest('base64url')
  const received = Buffer.from(sig)
  const expected = Buffer.from(expectedSig)
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null

  const [tokenEventId, userId, expiresAt] = Buffer.from(payloadB64, 'base64url').toString('utf8').split(':')
  if (!tokenEventId || !userId || !expiresAt) return null
  if (tokenEventId !== eventId) return null
  if (Date.now() > Number(expiresAt)) return null

  return { userId }
}
