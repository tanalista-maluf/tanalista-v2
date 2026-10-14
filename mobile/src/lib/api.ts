import { supabase } from './supabase'

export const apiUrl = process.env.EXPO_PUBLIC_API_URL!

// Chama a API do site (/api/v1) autenticando com o token de acesso do Supabase.
// Devolve o corpo da resposta mesmo em erro: as rotas respondem { error }.
async function apiRequest<T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T | { error: string }> {
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
  | { error: string; code?: 'FULL' | 'INSUFFICIENT_BALANCE' | 'PAYMENT_OPEN' }
  | { status: 'CONFIRMED' }
  | { status: 'PENDING'; participationId: string }

export type JoinMethod = 'PIX' | 'WALLET' | 'CREDIT_CARD'

// Sem options, vale para evento gratuito; em evento pago vai o meio de pagamento e o cupom.
// Também refaz o checkout de uma inscrição pendente que não tem cobrança em aberto.
export function joinEvent(
  eventId: string,
  options: { method?: JoinMethod; couponCode?: string; teamId?: string } = {}
) {
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

export type CardToken = {
  token: string
  payment_method_id: string
  issuer_id?: string | number
  identification?: { type?: string; number?: string }
}

// Cobra a inscrição pendente no cartão. O token vem do formulário do Mercado
// Pago (tela card/[participationId]); in_process = pagamento em análise.
export function createCardPayment(participationId: string, card: CardToken) {
  return apiPost<{ status: 'approved' | 'in_process' } | { error: string }>(
    `/api/v1/participations/${participationId}/card`,
    card
  )
}

// Cobrança em aberto de uma inscrição pendente: PIX gerado, cartão em análise ou nenhuma
export function fetchOpenPayment(participationId: string) {
  return apiGet<{ open: 'PIX' | 'CARD_REVIEW' | null } | { error: string }>(
    `/api/v1/participations/${participationId}/payment`
  )
}

// Meios de pagamento que dependem de configuração do servidor
export function fetchPaymentMethods() {
  return apiGet<{ card: boolean } | { error: string }>('/api/v1/payment-methods')
}

export type OnboardingField = 'username' | 'city' | 'phone'

export function completeOnboarding(data: Record<OnboardingField, string>) {
  return apiPost<{ success: true } | { error: string; field?: OnboardingField }>('/api/v1/me/onboarding', data)
}

// blockers: pendências que a pessoa precisa resolver antes de excluir a conta
export function deleteAccount() {
  return apiRequest<{ success: true } | { error: string; blockers?: string[] }>('DELETE', '/api/v1/me')
}

export type EventTeam = { id: string; name: string; capacity: number; confirmed_count: number }

// Times do evento com a ocupação de cada um (lista vazia = evento sem times)
export function fetchEventTeams(eventId: string) {
  return apiGet<{ teams: EventTeam[] } | { error: string }>(`/api/v1/events/${eventId}/teams`)
}

// Uma troca de time por inscrição confirmada
export function changeTeam(participationId: string, teamId: string) {
  return apiPost<{ success: true } | { error: string }>(`/api/v1/participations/${participationId}/team`, { teamId })
}

export function joinWaitlist(eventId: string, teamId?: string) {
  return apiPost<{ success: true; position: number } | { error: string }>(`/api/v1/events/${eventId}/waitlist`, {
    teamId,
  })
}

// Sair da fila, ou recusar a vaga que ela reservou
export function leaveWaitlist(eventId: string) {
  return apiRequest<{ success: true } | { error: string }>('DELETE', `/api/v1/events/${eventId}/waitlist`)
}

// Confirma a vaga reservada pela fila; em evento pago, com o meio de pagamento
export function confirmWaitlistSpot(eventId: string, method?: JoinMethod) {
  return apiPost<JoinEventResponse>(`/api/v1/events/${eventId}/waitlist/confirm`, { method })
}

// Enquanto aguarda, a pessoa pode mudar para a fila de outro time
export function changeWaitlistTeam(entryId: string, teamId: string) {
  return apiPost<{ success: true } | { error: string }>(`/api/v1/waitlist-entries/${entryId}/team`, { teamId })
}

export type GroupInput = {
  name: string
  description: string
  visibility: 'PUBLIC' | 'PRIVATE'
  category: string
  city: string
}

export function createGroup(data: GroupInput) {
  return apiPost<{ groupId: string; slug: string } | { error: string; field?: keyof GroupInput }>('/api/v1/groups', data)
}

// Só grupo público; em grupo privado a entrada é por convite ou pedido aprovado pelo dono
export function joinGroup(groupId: string) {
  return apiPost<{ success: true } | { error: string }>(`/api/v1/groups/${groupId}/membership`)
}

export function leaveGroup(groupId: string) {
  return apiRequest<{ success: true } | { error: string }>('DELETE', `/api/v1/groups/${groupId}/membership`)
}

// O dono aprova ou recusa um pedido de entrada no grupo
export function decideGroupRequest(requestId: string, decision: 'APPROVED' | 'REJECTED') {
  return apiPost<{ success: true } | { error: string }>(`/api/v1/group-requests/${requestId}`, { decision })
}

export type OwnProfile = {
  full_name: string
  username: string
  phone: string | null
  city: string | null
  bio: string | null
  avatar_url: string | null
}

// Dados pessoais de quem está logado; o telefone só vem por aqui
export function fetchOwnProfile() {
  return apiGet<OwnProfile | { error: string }>('/api/v1/me/profile')
}

export function updateProfile(data: { full_name: string; phone: string; city: string; bio: string }) {
  return apiPost<{ success: true } | { error: string }>('/api/v1/me/profile', data)
}

// Envia a foto de perfil escolhida no aparelho (JPG, PNG ou WebP de até 2MB), em base64
export function uploadAvatar(image: { base64: string; mimeType: string }) {
  return apiPost<{ avatarUrl: string } | { error: string }>('/api/v1/me/avatar', {
    image: image.base64,
    mimeType: image.mimeType,
  })
}

export type PublicProfile = {
  profile: {
    full_name: string | null
    username: string
    avatar_url: string | null
    city: string | null
    bio: string | null
    created_at: string
  }
  stats: { organized: number; participations: number; groups: number; rating: number | null }
  events: {
    id: string
    title: string
    starts_at: string
    city: string
    price: number
    capacity: number
    confirmed_count: number
    visibility: string
    groups: { name: string } | null
  }[]
  groups: {
    id: string
    name: string
    city: string | null
    category: string | null
    visibility: string
    avatar_url: string | null
    member_count: number
  }[]
}

export function fetchPublicProfile(username: string) {
  return apiGet<PublicProfile | { error: string }>(`/api/v1/profiles/${encodeURIComponent(username)}`)
}

export type GroupActivity = {
  id: string
  userName: string
  username: string
  avatarUrl: string | null
  eventId: string
  eventTitle: string
  groupName: string
  at: string
}

// Atividade recente nos grupos da pessoa, para a tela inicial
export function fetchHome() {
  return apiGet<{ activity: GroupActivity[] } | { error: string }>('/api/v1/me/home')
}

export type Person = { full_name: string | null; username: string | null; avatar_url: string | null } | null

export type PollOption = { id: string; text: string; position: number; vote_count: number }
export type Poll = {
  id: string
  question: string
  options: PollOption[]
  total_votes: number
  user_vote_option_id: string | null
}

// O que a página do evento mostra além dos dados do próprio evento. Mural,
// enquetes e fotos só vêm para o organizador e para inscritos confirmados (isMember).
export type EventExtras = {
  isOrganizer: boolean
  isMember: boolean
  participants: { id: string; status: string; team_id: string | null; profile: Person }[]
  comments: { id: string; content: string; created_at: string; canDelete: boolean; profile: Person }[]
  polls: Poll[]
  photos: { id: string; url: string; created_at: string; profile: Person }[]
  ratings: {
    average: number
    count: number
    items: { rating: number; comment: string | null; created_at: string; profile: Person }[]
    mine: number | null
  }
  photoUpload: boolean
  checkedInAt: string | null
  joinRequest: 'PENDING' | 'APPROVED' | 'REJECTED' | null
}

export function fetchEventExtras(eventId: string) {
  return apiGet<EventExtras | { error: string }>(`/api/v1/events/${eventId}/extras`)
}

type Done = { success: true } | { error: string }

export function postComment(eventId: string, content: string) {
  return apiPost<Done>(`/api/v1/events/${eventId}/comments`, { content })
}

export function deleteComment(commentId: string) {
  return apiRequest<Done>('DELETE', `/api/v1/comments/${commentId}`)
}

export function votePoll(pollId: string, optionId: string) {
  return apiPost<Done>(`/api/v1/polls/${pollId}/vote`, { optionId })
}

// Só para quem participou de um evento já concluído
export function submitRating(eventId: string, rating: number, comment: string) {
  return apiPost<Done>(`/api/v1/events/${eventId}/rating`, { rating, comment })
}

// Pedido de entrada em evento privado; o organizador aprova pelo site
export function requestEventJoin(eventId: string) {
  return apiPost<Done>(`/api/v1/events/${eventId}/join-request`)
}

export function uploadEventPhoto(eventId: string, image: { base64: string; mimeType: string }) {
  return apiPost<Done>(`/api/v1/events/${eventId}/photos`, { image: image.base64, mimeType: image.mimeType })
}

export type ReportReason = 'SPAM' | 'INAPPROPRIATE' | 'FAKE' | 'DANGEROUS' | 'OTHER'

export function submitReport(target: { type: 'EVENT' | 'GROUP'; id: string }, reason: ReportReason, description: string) {
  return apiPost<Done>('/api/v1/reports', { targetType: target.type, targetId: target.id, reason, description })
}
