import { createAdminClient } from '@/lib/supabase/admin'

// Leituras do painel de admin para o app mobile. Mesmas consultas das páginas
// de src/app/(admin)/admin. Quem chama confere antes se a pessoa é admin.

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean)

export function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email)
}

const PAGE_SIZE = 30

// % e _ são curingas do ilike, e vírgula e parênteses separam filtros
function term(q?: string) {
  return (q ?? '').trim().replace(/[%_,()]/g, ' ').slice(0, 60)
}

export async function getAdminDashboard() {
  const admin = createAdminClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalUsers },
    { count: newUsers },
    { count: totalEvents },
    { count: openEvents },
    { count: totalGroups },
    { count: totalParticipations },
    payments,
    { data: recentEvents },
    { data: recentUsers },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    admin.from('events').select('*', { count: 'exact', head: true }),
    admin.from('events').select('*', { count: 'exact', head: true }).in('status', ['OPEN', 'CONFIRMED']),
    admin.from('groups').select('*', { count: 'exact', head: true }),
    admin.from('participations').select('*', { count: 'exact', head: true }).eq('status', 'CONFIRMED'),
    // Só pagamentos de inscrição efetivamente confirmada, como no painel do site
    admin.from('payments')
      .select('amount, platform_fee, participations!payments_participation_id_fkey!inner(status)')
      .eq('status', 'APPROVED')
      .eq('participations.status', 'CONFIRMED')
      .gte('created_at', thirtyDaysAgo),
    admin.from('events')
      .select('id, title, status, starts_at, profiles!events_organizer_id_fkey(username)')
      .order('created_at', { ascending: false })
      .limit(8),
    admin.from('profiles')
      .select('id, full_name, username, city, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  return {
    totalUsers: totalUsers ?? 0,
    newUsers: newUsers ?? 0,
    totalEvents: totalEvents ?? 0,
    openEvents: openEvents ?? 0,
    totalGroups: totalGroups ?? 0,
    totalParticipations: totalParticipations ?? 0,
    grossRevenue: (payments.data ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0),
    platformRevenue: (payments.data ?? []).reduce((sum, row) => sum + (row.platform_fee ?? 0), 0),
    recentEvents: recentEvents ?? [],
    recentUsers: recentUsers ?? [],
  }
}

export async function listAdminWithdrawals() {
  const admin = createAdminClient()
  const { data: withdrawals } = await admin
    .from('withdrawals')
    .select('id, user_id, amount_cents, fee_cents, net_cents, cpf, pix_key, pix_key_type, status, created_at, processed_at')
    .order('created_at', { ascending: false })
    .limit(100)

  const userIds = [...new Set((withdrawals ?? []).map((row) => row.user_id))]
  const { data: profiles } = userIds.length
    ? await admin.from('profiles').select('id, full_name, username').in('id', userIds)
    : { data: [] }

  return (withdrawals ?? []).map((row) => ({ ...row, profile: profiles?.find((p) => p.id === row.user_id) ?? null }))
}

// O e-mail fica em auth.users, fora de profiles; o telefone vem do perfil.
// Só o admin vê esses contatos (quem chama já conferiu).
export async function listAdminUsers(q?: string, page = 1) {
  const admin = createAdminClient()
  const offset = (Math.max(1, page) - 1) * PAGE_SIZE
  let query = admin
    .from('profiles')
    .select('id, full_name, username, city, phone, wallet_balance, created_at, onboarding_completed', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)
  if (term(q)) query = query.or(`username.ilike.%${term(q)}%,full_name.ilike.%${term(q)}%,phone.ilike.%${term(q)}%`)
  const { data, count } = await query

  const users = await Promise.all(
    (data ?? []).map(async (profile) => {
      const { data: auth } = await admin.auth.admin.getUserById(profile.id)
      return { ...profile, email: auth.user?.email ?? null }
    })
  )
  return { users, total: count ?? 0, pageSize: PAGE_SIZE }
}

export async function listAdminEvents(q?: string, status?: string) {
  let query = createAdminClient()
    .from('events')
    .select('id, title, status, starts_at, price, confirmed_count, capacity, city, profiles!events_organizer_id_fkey(username)', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(0, PAGE_SIZE - 1)
  if (term(q)) query = query.ilike('title', `%${term(q)}%`)
  if (status && ['DRAFT', 'OPEN', 'CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED'].includes(status)) {
    query = query.eq('status', status as 'OPEN')
  }
  const { data, count } = await query
  return { events: data ?? [], total: count ?? 0 }
}

export async function listAdminGroups(q?: string) {
  let query = createAdminClient()
    .from('groups')
    .select('id, name, category, city, visibility, member_count, created_at, profiles!groups_owner_id_fkey(username)', {
      count: 'exact',
    })
    .order('member_count', { ascending: false })
    .range(0, PAGE_SIZE - 1)
  if (term(q)) query = query.ilike('name', `%${term(q)}%`)
  const { data, count } = await query
  return { groups: data ?? [], total: count ?? 0 }
}

// Cupons de crédito da plataforma (os de evento e de grupo ficam com os organizadores)
export async function listAdminCoupons() {
  const { data } = await createAdminClient()
    .from('coupons')
    .select('id, code, amount_cents, max_uses, uses_count, expires_at, active, created_at')
    .is('event_id', null)
    .is('group_id', null)
    .order('created_at', { ascending: false })
  return data ?? []
}
