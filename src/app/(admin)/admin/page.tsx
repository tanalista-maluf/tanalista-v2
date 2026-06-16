import { createAdminClient } from '@/lib/supabase/admin'
import { formatPrice } from '@/utils/format'
import { Users, Calendar, UsersRound, TrendingUp, AlertCircle, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getStats() {
  const admin = createAdminClient()
  const now = new Date().toISOString()
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
    admin.from('payments').select('amount, platform_fee').eq('status', 'APPROVED').gte('created_at', thirtyDaysAgo),
    admin.from('events')
      .select('id, title, status, starts_at, capacity, organizer_id, profiles!events_organizer_id_fkey(full_name, username)')
      .order('created_at', { ascending: false })
      .limit(8),
    admin.from('profiles')
      .select('id, full_name, username, city, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const grossRevenue = (payments.data ?? []).reduce((s: number, p: { amount: number }) => s + (p.amount ?? 0), 0)
  const platformRevenue = (payments.data ?? []).reduce((s: number, p: { platform_fee: number }) => s + (p.platform_fee ?? 0), 0)

  return {
    totalUsers: totalUsers ?? 0,
    newUsers: newUsers ?? 0,
    totalEvents: totalEvents ?? 0,
    openEvents: openEvents ?? 0,
    totalGroups: totalGroups ?? 0,
    totalParticipations: totalParticipations ?? 0,
    grossRevenue,
    platformRevenue,
    recentEvents: recentEvents ?? [],
    recentUsers: recentUsers ?? [],
  }
}

export default async function AdminDashboardPage() {
  const stats = await getStats()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-white/40 mt-1">Visão geral da plataforma · últimos 30 dias onde aplicável</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Usuários" value={stats.totalUsers} sub={`+${stats.newUsers} este mês`} color="blue" />
        <StatCard icon={Calendar} label="Eventos" value={stats.totalEvents} sub={`${stats.openEvents} ativos`} color="green" />
        <StatCard icon={UsersRound} label="Grupos" value={stats.totalGroups} color="purple" />
        <StatCard icon={TrendingUp} label="Inscrições" value={stats.totalParticipations} sub="confirmadas" color="yellow" />
      </div>

      {/* Receita */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-dark rounded-2xl p-5">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Receita bruta (30d)</p>
          <p className="text-3xl font-bold text-primary">{formatPrice(stats.grossRevenue)}</p>
        </div>
        <div className="card-dark rounded-2xl p-5">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Receita da plataforma (30d)</p>
          <p className="text-3xl font-bold text-yellow-400">{formatPrice(stats.platformRevenue)}</p>
        </div>
      </div>

      {/* Tabelas recentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Eventos recentes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/70">Eventos recentes</h2>
            <a href="/admin/eventos" className="text-xs text-primary hover:underline">Ver todos</a>
          </div>
          <div className="card-dark rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-white/40 font-medium">Evento</th>
                  <th className="text-right px-4 py-3 text-white/40 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {stats.recentEvents.map((ev: any) => (
                  <tr key={ev.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white/80 font-medium truncate max-w-[160px]">{ev.title}</p>
                      <p className="text-white/30 mt-0.5">@{(ev as any).profiles?.username}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <StatusChip status={ev.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Usuários recentes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/70">Usuários recentes</h2>
            <a href="/admin/usuarios" className="text-xs text-primary hover:underline">Ver todos</a>
          </div>
          <div className="card-dark rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-white/40 font-medium">Usuário</th>
                  <th className="text-right px-4 py-3 text-white/40 font-medium">Cidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {stats.recentUsers.map((u: any) => (
                  <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white/80 font-medium">{u.full_name ?? '—'}</p>
                      <p className="text-white/30 mt-0.5">@{u.username}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-white/40">{u.city ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  sub?: string
  color: 'blue' | 'green' | 'purple' | 'yellow'
}) {
  const colors = {
    blue: 'bg-blue-400/10 border-blue-400/20 text-blue-400',
    green: 'bg-primary/10 border-primary/20 text-primary',
    purple: 'bg-purple-400/10 border-purple-400/20 text-purple-400',
    yellow: 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400',
  }
  return (
    <div className="card-dark rounded-2xl p-5 space-y-3">
      <div className={`size-9 rounded-xl border flex items-center justify-center ${colors[color]}`}>
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value.toLocaleString('pt-BR')}</p>
        <p className="text-xs text-white/40 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-white/25 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  DRAFT:      { label: 'Rascunho',   className: 'text-white/40 bg-white/5' },
  OPEN:       { label: 'Aberto',     className: 'text-primary bg-primary/10' },
  PENDING:    { label: 'Pendente',   className: 'text-yellow-400 bg-yellow-400/10' },
  CONFIRMED:  { label: 'Confirmado', className: 'text-blue-400 bg-blue-400/10' },
  COMPLETED:  { label: 'Concluído',  className: 'text-white/50 bg-white/5' },
  CANCELLED:  { label: 'Cancelado',  className: 'text-red-400 bg-red-400/10' },
  MIN_NOT_MET:{ label: 'Mín. não atingido', className: 'text-orange-400 bg-orange-400/10' },
}

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status] ?? { label: status, className: 'text-white/40 bg-white/5' }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
