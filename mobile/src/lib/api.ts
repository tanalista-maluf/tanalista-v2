import { supabase } from './supabase'

const apiUrl = process.env.EXPO_PUBLIC_API_URL!

// Chama a API do site (/api/v1) autenticando com o token de acesso do Supabase.
// Devolve o corpo da resposta mesmo em erro: as rotas respondem { error }.
async function apiRequest<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T | { error: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Sessão expirada. Entre novamente.' }

  try {
    const response = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
    })
    return await response.json()
  } catch {
    return { error: 'Não foi possível falar com o servidor. Verifique sua conexão.' }
  }
}

export function apiPost<T>(path: string, body: unknown = {}) {
  return apiRequest<T>('POST', path, body)
}

export function apiGet<T>(path: string) {
  return apiRequest<T>('GET', path)
}

export type JoinEventResponse =
  | { error: string; code?: 'FULL' | 'INSUFFICIENT_BALANCE' }
  | { status: 'CONFIRMED' }
  | { status: 'PENDING'; participationId: string }

export type JoinMethod = 'PIX' | 'WALLET'

// Sem options, vale para evento gratuito; em evento pago vai o meio de pagamento e o cupom
export function joinEvent(eventId: string, options: { method?: JoinMethod; couponCode?: string } = {}) {
  return apiPost<JoinEventResponse>(`/api/v1/events/${eventId}/join`, options)
}

// Desconto que um cupom dá na inscrição do evento; o uso só é registrado ao se inscrever
export function validateCoupon(eventId: string, code: string) {
  return apiPost<{ discount_cents: number } | { error: string }>(`/api/v1/events/${eventId}/coupon`, { code })
}

export function fetchWalletBalance() {
  return apiGet<{ balance: number } | { error: string }>('/api/v1/me/wallet')
}

export type CancelParticipationResponse =
  | { error: string; code?: 'NOT_ALLOWED' | 'TOO_LATE' }
  | { success: true }

export function cancelParticipation(participationId: string) {
  return apiPost<CancelParticipationResponse>(`/api/v1/participations/${participationId}/cancel`)
}

export type PixPayment = { payment_id: string; qr_code?: string; qr_code_base64?: string; expires_at: string }

// Gera a cobrança PIX de uma inscrição pendente, ou devolve a que já existe
export function createPixPayment(participationId: string) {
  return apiPost<PixPayment | { error: string }>(`/api/v1/participations/${participationId}/pix`)
}
