import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface EventFinancial {
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

export async function getOrganizerFinancials(): Promise<EventFinancial[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Buscar eventos do organizador com dados financeiros
  const { data: events } = await supabase
    .from('events')
    .select('id, title, starts_at, status, price, capacity, payout_claimed_at')
    .eq('organizer_id', user.id)
    .neq('status', 'DRAFT')
    .order('starts_at', { ascending: false })
    .limit(50)

  if (!events || events.length === 0) return []

  // Para cada evento, buscar totais de pagamentos aprovados
  const results = await Promise.all(
    events.map(async (event) => {
      const { data: partRows } = await supabase
        .from('participations')
        .select('id')
        .eq('event_id', event.id)
        .eq('status', 'CONFIRMED')

      const partIds = (partRows ?? []).map((p) => p.id)
      const confirmedCount = partIds.length

      let gross = 0, platformFees = 0, gatewayFees = 0
      if (partIds.length > 0) {
        const { data: payments } = await supabase
          .from('payments')
          .select('amount, platform_fee, gateway_fee')
          .eq('status', 'APPROVED')
          .in('participation_id', partIds)

        gross        = payments?.reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0
        platformFees = payments?.reduce((s, p) => s + (p.platform_fee ?? 0), 0) ?? 0
        gatewayFees  = payments?.reduce((s, p) => s + (p.gateway_fee ?? 0), 0) ?? 0
      }

      return {
        ...event,
        confirmed_count: confirmedCount,
        gross_revenue:   gross,
        platform_fees:   platformFees,
        gateway_fees:    gatewayFees,
        net_revenue:     gross - platformFees - gatewayFees,
      }
    })
  )

  return results
}

export interface EventParticipant {
  participation_id: string
  user_id: string
  name: string
  email: string
  joined_at: string
  payment_method: string | null
  payment_amount: number | null
}

export async function getEventFinancialDetail(eventId: string): Promise<{
  event: (EventFinancial & { payout_claimed_at: string | null }) | null
  participants: EventParticipant[]
  byMethod: Record<string, { count: number; total: number }>
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { event: null, participants: [], byMethod: {} }

  const admin = createAdminClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, title, starts_at, status, price, capacity, payout_claimed_at')
    .eq('id', eventId)
    .eq('organizer_id', user.id)
    .maybeSingle()

  if (!event) return { event: null, participants: [], byMethod: {} }

  // Participações confirmadas
  const { data: partRows } = await admin
    .from('participations')
    .select('id, user_id, created_at')
    .eq('event_id', eventId)
    .eq('status', 'CONFIRMED')
    .order('created_at', { ascending: true })

  const partIds = (partRows ?? []).map((p) => p.id)
  const userIds = [...new Set((partRows ?? []).map((p) => p.user_id))]

  // Buscar perfis (admin para bypassar RLS) e pagamentos em paralelo
  const [profilesResult, paymentsResult] = await Promise.all([
    userIds.length > 0
      ? admin.from('profiles').select('id, full_name, username').in('id', userIds)
      : Promise.resolve({ data: [] }),
    partIds.length > 0
      ? admin.from('payments').select('participation_id, amount, platform_fee, gateway_fee, method').eq('status', 'APPROVED').in('participation_id', partIds)
      : Promise.resolve({ data: [] }),
  ])

  const profileMap = Object.fromEntries(
    (profilesResult.data ?? []).map((p: any) => [p.id, p])
  )
  const paymentMap = Object.fromEntries(
    (paymentsResult.data ?? []).map((p: any) => [p.participation_id, p])
  )

  const gross        = (paymentsResult.data ?? []).reduce((s: number, p: any) => s + (p.amount ?? 0), 0)
  const platformFees = (paymentsResult.data ?? []).reduce((s: number, p: any) => s + (p.platform_fee ?? 0), 0)
  const gatewayFees  = (paymentsResult.data ?? []).reduce((s: number, p: any) => s + (p.gateway_fee ?? 0), 0)

  const eventFinancial = {
    ...event,
    confirmed_count: partIds.length,
    gross_revenue: gross,
    platform_fees: platformFees,
    gateway_fees: gatewayFees,
    net_revenue: gross - platformFees - gatewayFees,
  }

  const participants: EventParticipant[] = (partRows ?? []).map((p) => {
    const profile = profileMap[p.user_id]
    const payment = paymentMap[p.id]
    return {
      participation_id: p.id,
      user_id: p.user_id,
      name: profile?.full_name ?? profile?.username ?? '—',
      email: profile?.username ?? p.user_id.slice(0, 8),
      joined_at: p.created_at,
      payment_method: payment?.method ?? null,
      payment_amount: payment?.amount ?? null,
    }
  })

  const byMethod: Record<string, { count: number; total: number }> = {}
  for (const p of participants) {
    const m = p.payment_method ?? 'FREE'
    if (!byMethod[m]) byMethod[m] = { count: 0, total: 0 }
    byMethod[m].count++
    byMethod[m].total += p.payment_amount ?? 0
  }

  return { event: eventFinancial, participants, byMethod }
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
