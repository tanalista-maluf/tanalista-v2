import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEventFinancialDetail } from '@/features/financeiro/queries'
import { formatBalance, formatDate } from '@/utils/format'
import Link from 'next/link'
import { ArrowLeft, Users, DollarSign, Wallet, CreditCard, QrCode, Gift } from 'lucide-react'
import { ClaimPayoutButton } from '@/features/financeiro/components/ClaimPayoutButton'

export const dynamic = 'force-dynamic'

const METHOD_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  PIX:    { label: 'PIX',    icon: QrCode },
  CARD:   { label: 'Cartão', icon: CreditCard },
  WALLET: { label: 'Carteira', icon: Wallet },
  FREE:   { label: 'Gratuito', icon: Gift },
}

export default async function EventFinanceiroPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { event, participants, byMethod } = await getEventFinancialDetail(eventId)
  if (!event) notFound()

  const occupancy = event.capacity > 0 ? event.confirmed_count / event.capacity : 0
  const avgTicket = event.confirmed_count > 0 ? event.gross_revenue / event.confirmed_count : 0

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/financeiro" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
          <ArrowLeft className="size-4 text-white/60" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-white leading-tight line-clamp-2" style={{ fontFamily: 'var(--font-heading)' }}>
            {event.title}
          </h1>
          <p className="text-xs text-white/40">{formatDate(event.starts_at)}</p>
        </div>
      </div>

      {/* Ocupação */}
      <div className="card-dark rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40 font-semibold uppercase tracking-widest">Ocupação</span>
          <span className="text-sm font-bold text-white">{event.confirmed_count} / {event.capacity}</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(occupancy * 100, 100)}%` }}
          />
        </div>
        <p className="text-xs text-white/30">{Math.round(occupancy * 100)}% preenchido</p>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-dark rounded-2xl p-4">
          <p className="text-xs text-white/40 mb-1">Receita bruta</p>
          <p className="text-xl font-bold text-white">{formatBalance(event.gross_revenue)}</p>
        </div>
        <div className="card-dark rounded-2xl p-4">
          <p className="text-xs text-white/40 mb-1">Receita líquida</p>
          <p className="text-xl font-bold text-primary">{formatBalance(event.net_revenue)}</p>
        </div>
        <div className="card-dark rounded-2xl p-4">
          <p className="text-xs text-white/40 mb-1">Ticket médio</p>
          <p className="text-xl font-bold text-white">{formatBalance(avgTicket)}</p>
        </div>
        <div className="card-dark rounded-2xl p-4">
          <p className="text-xs text-white/40 mb-1">Taxas totais</p>
          <p className="text-xl font-bold text-white">{formatBalance(event.platform_fees + event.gateway_fees)}</p>
        </div>
      </div>

      {/* Por forma de pagamento */}
      {Object.keys(byMethod).length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Por forma de pagamento</h2>
          <div className="space-y-2">
            {Object.entries(byMethod).map(([method, data]) => {
              const cfg = METHOD_LABELS[method] ?? { label: method, icon: DollarSign }
              const Icon = cfg.icon
              return (
                <div key={method} className="card-dark rounded-2xl p-3 flex items-center gap-3">
                  <div className="size-8 rounded-xl bg-white/5 flex items-center justify-center">
                    <Icon className="size-4 text-white/50" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{cfg.label}</p>
                    <p className="text-xs text-white/35">{data.count} participante{data.count !== 1 ? 's' : ''}</p>
                  </div>
                  <p className="text-sm font-bold text-primary">{formatBalance(data.total)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Botão de resgate */}
      <ClaimPayoutButton
        eventId={event.id}
        netCents={event.net_revenue}
        alreadyClaimed={!!event.payout_claimed_at}
        startsAt={event.starts_at}
      />

      {/* Lista de participantes */}
      <div>
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">
          Participantes ({participants.length})
        </h2>
        {participants.length === 0 ? (
          <div className="card-dark rounded-2xl p-8 text-center">
            <Users className="size-8 mx-auto text-white/15 mb-2" />
            <p className="text-sm text-white/40">Nenhum inscrito confirmado ainda.</p>
          </div>
        ) : (
          <div className="card-dark rounded-2xl divide-y divide-white/[0.04]">
            {participants.map((p) => {
              const methodCfg = METHOD_LABELS[p.payment_method ?? 'FREE']
              return (
                <div key={p.participation_id} className="flex items-center gap-3 px-4 py-3">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.name}</p>
                    <p className="text-xs text-white/35 truncate">{p.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary">
                      {p.payment_amount !== null ? formatBalance(p.payment_amount) : '—'}
                    </p>
                    <p className="text-[10px] text-white/30">{methodCfg?.label ?? p.payment_method}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
