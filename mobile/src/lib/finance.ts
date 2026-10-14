// Tipos e rótulos do financeiro do organizador (src/features/financeiro no site)

export type EventFinancial = {
  id: string
  title: string
  starts_at: string
  status: string
  price: number
  capacity: number
  payout_claimed_at?: string | null
  confirmed_count: number
  gross_revenue: number
  platform_fees: number
  gateway_fees: number
  net_revenue: number
}

export const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberto',
  CONFIRMED: 'Confirmado',
  PENDING: 'Pendente',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}
