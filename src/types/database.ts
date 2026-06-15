// Este arquivo será substituído pelo output do comando:
// npx supabase gen types typescript --project-id <id> --schema public > src/types/database.ts
//
// Por enquanto, declara os tipos de domínio manualmente para uso nas features.
// Os clients Supabase usam `any` até a geração automática.

// ── Tipos de linha (espelham as migrations) ──────────────

export interface ProfileRow {
  id: string
  full_name: string
  username: string
  avatar_url: string | null
  cpf: string | null
  phone: string | null
  bio: string | null
  city: string | null
  wallet_balance: number
  mp_account_id: string | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface GroupRow {
  id: string
  owner_id: string
  name: string
  description: string | null
  avatar_url: string | null
  visibility: 'PUBLIC' | 'PRIVATE'
  category: string | null
  city: string | null
  member_count: number
  created_at: string
  updated_at: string
}

export interface GroupMemberRow {
  id: string
  group_id: string
  user_id: string
  role: 'OWNER' | 'MEMBER'
  joined_at: string
}

export interface EventRow {
  id: string
  group_id: string
  organizer_id: string
  title: string
  description: string | null
  cover_url: string | null
  address: string
  city: string
  category: string | null
  status: 'DRAFT' | 'OPEN' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  price: number
  capacity: number
  min_participants: number
  waitlist_capacity: number
  starts_at: string
  ends_at: string | null
  registration_deadline: string
  min_check_at: string
  organizer_exempt: boolean
  mp_access_token: string | null
  created_at: string
  updated_at: string
}

export interface ParticipationRow {
  id: string
  event_id: string
  user_id: string
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'WAITLISTED'
  payment_id: string | null
  created_at: string
  updated_at: string
}

export interface WaitlistEntryRow {
  id: string
  event_id: string
  user_id: string
  position: number
  status: 'WAITING' | 'NOTIFIED' | 'EXPIRED' | 'CONFIRMED'
  notified_at: string | null
  expires_at: string | null
  created_at: string
}

export interface PaymentRow {
  id: string
  participation_id: string | null
  wallet_transaction_id: string | null
  payer_id: string
  amount: number
  platform_fee: number
  gateway_fee: number
  method: 'PIX' | 'CREDIT_CARD' | 'WALLET'
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED' | 'CANCELLED'
  gateway_transaction_id: string | null
  gateway_response: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface WalletTransactionRow {
  id: string
  user_id: string
  type: 'DEPOSIT' | 'PAYMENT' | 'REFUND' | 'WITHDRAWAL' | 'PAYOUT'
  amount: number
  balance_after: number
  description: string | null
  payment_id: string | null
  event_id: string | null
  created_at: string
}

export interface NotificationRow {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  read: boolean
  data: Record<string, unknown> | null
  created_at: string
}

export interface PlatformConfigRow {
  key: string
  value: string
  description: string | null
  updated_at: string
}

// Placeholder — substituído por `supabase gen types`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any
