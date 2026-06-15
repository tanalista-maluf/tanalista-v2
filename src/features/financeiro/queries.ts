import { createClient } from '@/lib/supabase/server'

export interface EventFinancial {
  id: string
  title: string
  starts_at: string
  status: string
  price: number
  capacity: number
  confirmed_count: number
  gross_revenue: number
  platform_fees: number
  gateway_fees: number
  net_revenue: number
}

export async function getOrganizerFinancials(): Promise<EventFinancial[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Buscar eventos do organizador com dados financeiros
  const { data: events } = await supabase
    .from('events')
    .select('id, title, starts_at, status, price, capacity')
    .eq('organizer_id', user.id)
    .neq('status', 'DRAFT')
    .order('starts_at', { ascending: false })
    .limit(50)

  if (!events || events.length === 0) return []

  // Para cada evento, buscar totais de pagamentos aprovados
  const results = await Promise.all(
    events.map(async (event) => {
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, platform_fee, gateway_fee')
        .eq('status', 'APPROVED')
        .in(
          'participation_id',
          supabase
            .from('participations')
            .select('id')
            .eq('event_id', event.id)
            .eq('status', 'CONFIRMED') as any
        )

      const { count } = await supabase
        .from('participations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('status', 'CONFIRMED')

      const gross        = payments?.reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0
      const platformFees = payments?.reduce((s, p) => s + (p.platform_fee ?? 0), 0) ?? 0
      const gatewayFees  = payments?.reduce((s, p) => s + (p.gateway_fee ?? 0), 0) ?? 0

      return {
        ...event,
        confirmed_count: count ?? 0,
        gross_revenue:   gross,
        platform_fees:   platformFees,
        gateway_fees:    gatewayFees,
        net_revenue:     gross - platformFees - gatewayFees,
      }
    })
  )

  return results
}

export async function getOrganizerSummary() {
  const events = await getOrganizerFinancials()

  const totalGross    = events.reduce((s, e) => s + e.gross_revenue, 0)
  const totalNet      = events.reduce((s, e) => s + e.net_revenue, 0)
  const totalFees     = events.reduce((s, e) => s + e.platform_fees + e.gateway_fees, 0)
  const totalEvents   = events.length
  const activeEvents  = events.filter((e) => e.status === 'OPEN').length

  return { totalGross, totalNet, totalFees, totalEvents, activeEvents, events }
}
