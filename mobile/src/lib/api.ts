import { supabase } from './supabase'

const apiUrl = process.env.EXPO_PUBLIC_API_URL!

// Chama a API do site (/api/v1) autenticando com o token de acesso do Supabase.
// Devolve o corpo da resposta mesmo em erro: as rotas respondem { error }.
export async function apiPost<T>(path: string, body: unknown = {}): Promise<T | { error: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Sessão expirada. Entre novamente.' }

  try {
    const response = await fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    })
    return await response.json()
  } catch {
    return { error: 'Não foi possível falar com o servidor. Verifique sua conexão.' }
  }
}

export type JoinEventResponse =
  | { error: string; code?: 'FULL' | 'INSUFFICIENT_BALANCE' }
  | { status: 'CONFIRMED' }
  | { status: 'PENDING'; participationId: string }

export function joinEvent(eventId: string) {
  return apiPost<JoinEventResponse>(`/api/v1/events/${eventId}/join`)
}

export type CancelParticipationResponse =
  | { error: string; code?: 'NOT_ALLOWED' | 'TOO_LATE' }
  | { success: true }

export function cancelParticipation(participationId: string) {
  return apiPost<CancelParticipationResponse>(`/api/v1/participations/${participationId}/cancel`)
}
