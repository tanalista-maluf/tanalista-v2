import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizerSummary } from '@/features/financeiro/queries'
import { EventPayoutTable } from '@/features/financeiro/components/EventPayoutTable'
import { ExportFinanceiroButton } from '@/features/financeiro/components/ExportFinanceiroButton'
import { formatBalance } from '@/utils/format'
import { TrendingUp, Calendar, Users, Ticket, ArrowLeft, Filter } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { from, to } = await searchParams
  const summary = await getOrganizerSummary({ from, to })

  const totalParticipants = summary.events.reduce((s, e) => s + e.confirmed_count, 0)
  const avgTicket = totalParticipants > 0 ? summary.totalGross / totalParticipants : 0
  const avgOccupancy = summary.events.length > 0
    ? summary.events.reduce((s, e) => s + (e.capacity > 0 ? e.confirmed_count / e.capacity : 0), 0) / summary.events.length
    : 0
  const activeEvents = summary.events.filter(e => e.status === 'OPEN').length
  const isFiltered = from || to

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/home" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
          <ArrowLeft className="size-4 text-white/60" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
            Financeiro
          </h1>
          <p className="text-sm text-white/40">Receitas e estatísticas dos seus eventos</p>
        </div>
      </div>

      {/* Filtro de período */}
      <form method="GET" className="flex items-end gap-2 flex-wrap">
        <div className="flex-1 min-w-[130px] space-y-1">
          <label className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">De</label>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ''}
            className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <div className="flex-1 min-w-[130px] space-y-1">
          <label className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Até</label>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ''}
            className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <button
          type="submit"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
        >
          <Filter className="size-3.5" />
          Filtrar
        </button>
        {isFiltered && (
          <Link
            href="/financeiro"
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm font-semibold hover:bg-white/10 transition-colors"
          >
            Limpar
          </Link>
        )}
      </form>

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
