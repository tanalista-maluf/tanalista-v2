import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizerSummary } from '@/features/financeiro/queries'
import { EventPayoutTable } from '@/features/financeiro/components/EventPayoutTable'
import { ExportFinanceiroButton } from '@/features/financeiro/components/ExportFinanceiroButton'
import { formatBalance } from '@/utils/format'
import { TrendingUp, DollarSign, Receipt, Calendar, Users, Ticket } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function FinanceiroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const summary = await getOrganizerSummary()

  const totalParticipants = summary.events.reduce((s, e) => s + e.confirmed_count, 0)
  const avgTicket = totalParticipants > 0 ? summary.totalGross / totalParticipants : 0
  const avgOccupancy = summary.events.length > 0
    ? summary.events.reduce((s, e) => s + (e.capacity > 0 ? e.confirmed_count / e.capacity : 0), 0) / summary.events.length
    : 0
  const activeEvents = summary.events.filter(e => e.status === 'OPEN').length

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
          Financeiro
        </h1>
        <p className="text-sm text-white/40">Receitas e estatísticas dos seus eventos</p>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-2 gap-3">
        <div className="wallet-gradient rounded-2xl p-4 col-span-2">
          <p className="text-xs font-bold uppercase tracking-widest text-primary/60 mb-1">Receita líquida total</p>
          <p className="text-4xl font-extrabold text-primary tracking-tight">{formatBalance(summary.totalNet)}</p>
          <p className="text-xs text-white/30 mt-1">Bruto: {formatBalance(summary.totalGross)} · Taxas: {formatBalance(summary.totalFees)}</p>
        </div>

        <StatCard icon={Calendar} label="Eventos" value={String(summary.totalEvents)} sub={`${activeEvents} ativos`} color="blue" />
        <StatCard icon={Users} label="Participantes" value={String(totalParticipants)} sub="confirmados" color="green" />
        <StatCard icon={Ticket} label="Ticket médio" value={formatBalance(avgTicket)} color="purple" />
        <StatCard icon={TrendingUp} label="Ocupação média" value={`${Math.round(avgOccupancy * 100)}%`} color="yellow" />
      </div>

      {/* Lista de eventos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Por evento</h2>
          <ExportFinanceiroButton events={summary.events} />
        </div>
        <EventPayoutTable events={summary.events} />
      </div>
    </main>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
  color: 'blue' | 'green' | 'purple' | 'yellow'
}) {
  const colors = {
    blue:   'bg-blue-400/10 border-blue-400/20 text-blue-400',
    green:  'bg-primary/10 border-primary/20 text-primary',
    purple: 'bg-purple-400/10 border-purple-400/20 text-purple-400',
    yellow: 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400',
  }
  return (
    <div className="card-dark rounded-2xl p-4 space-y-2">
      <div className={`size-8 rounded-xl flex items-center justify-center border ${colors[color]}`}>
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-lg font-bold text-white">{value}</p>
        <p className="text-xs text-white/40">{label}</p>
        {sub && <p className="text-xs text-white/25">{sub}</p>}
      </div>
    </div>
  )
}
