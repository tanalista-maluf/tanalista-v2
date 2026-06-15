// ──────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────

export type UserRole = 'PARTICIPANT' | 'ORGANIZER'

export type GroupVisibility = 'PUBLIC' | 'PRIVATE'

export type EventStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'PENDING'      // aguardando mínimo de participantes em T-12h
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'

export type ParticipationStatus =
  | 'CONFIRMED'    // pagamento confirmado
  | 'PENDING'      // aguardando pagamento (PIX)
  | 'CANCELLED'
  | 'WAITLISTED'

export type WaitlistStatus = 'WAITING' | 'NOTIFIED' | 'EXPIRED' | 'CONFIRMED'

export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'WALLET'

export type PaymentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'REFUNDED'
  | 'CANCELLED'

export type WalletTransactionType =
  | 'DEPOSIT'
  | 'PAYMENT'
  | 'REFUND'
  | 'WITHDRAWAL'
  | 'PAYOUT'       // repasse ao organizador

export type NotificationType =
  | 'EVENT_CONFIRMED'
  | 'EVENT_CANCELLED'
  | 'EVENT_REMINDER'
  | 'WAITLIST_NOTIFIED'
  | 'WAITLIST_EXPIRED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_FAILED'
  | 'PAYOUT_PROCESSED'
  | 'ORGANIZER_STATUS_CHANGE'

// ──────────────────────────────────────────────
// Domain types (alinhados com Doc 04 + Doc 15)
// ──────────────────────────────────────────────

export interface User {
  id: string
  email: string
  full_name: string
  username: string
  avatar_url: string | null
  cpf: string | null          // obrigatório para saque (Doc 15 Adendo 02)
  phone: string | null
  bio: string | null
  city: string | null
  wallet_balance: number      // em centavos
  mp_account_id: string | null
  created_at: string
  updated_at: string
}

export interface Group {
  id: string
  owner_id: string
  name: string
  description: string | null
  avatar_url: string | null
  visibility: GroupVisibility
  category: string | null
  city: string | null
  member_count: number
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  group_id: string
  organizer_id: string
  title: string
  description: string | null
  cover_url: string | null
  address: string
  city: string
  category: string | null
  status: EventStatus
  price: number               // em centavos
  capacity: number
  min_participants: number
  waitlist_capacity: number
  starts_at: string
  ends_at: string | null
  registration_deadline: string
  min_check_at: string        // T-12h (calculado)
  organizer_exempt: boolean   // organizador isento de pagamento (Adendo 02)
  mp_access_token: string | null
  created_at: string
  updated_at: string
}

export interface Participation {
  id: string
  event_id: string
  user_id: string
  status: ParticipationStatus
  payment_id: string | null
  created_at: string
  updated_at: string
}

export interface WaitlistEntry {
  id: string
  event_id: string
  user_id: string
  position: number
  status: WaitlistStatus
  notified_at: string | null
  expires_at: string | null
  created_at: string
}

export interface Payment {
  id: string
  participation_id: string | null
  wallet_transaction_id: string | null
  payer_id: string
  amount: number              // em centavos
  platform_fee: number        // em centavos
  gateway_fee: number         // em centavos
  method: PaymentMethod
  status: PaymentStatus
  gateway_transaction_id: string | null
  gateway_response: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface WalletTransaction {
  id: string
  user_id: string
  type: WalletTransactionType
  amount: number              // em centavos (positivo = crédito, negativo = débito)
  balance_after: number       // em centavos
  description: string | null
  payment_id: string | null
  event_id: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  data: Record<string, unknown> | null
  created_at: string
}

export interface PlatformConfig {
  key: string
  value: string
  description: string | null
  updated_at: string
}

// ──────────────────────────────────────────────
// UI helpers
// ──────────────────────────────────────────────

export interface PaginationCursor {
  created_at: string
  id: string
}

export interface PaginatedResult<T> {
  data: T[]
  next_cursor: PaginationCursor | null
  has_more: boolean
}
