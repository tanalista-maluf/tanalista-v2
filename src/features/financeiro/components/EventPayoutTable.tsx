import { formatBalance, formatDate } from '@/utils/format'
import { EventFinancial } from '@/features/financeiro/queries'
import Link from 'next/link'
import { ChevronRight, BarChart2 } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  OPEN: { label: 'Aberto', cls: 'text-primary bg-primary/10 border-primary/25' },
  CLOSED: { label: 'Encerrado', cls: 'text-white/50 bg-white/5 border-white/10' },
  CANCELLED: { label: 'Cancelado', cls: 'text-red-400 bg-red-400/10 border-red-400/20' },
  COMPLETED: { label: 'Concluído', cls: 'text-white/50 bg-white/5 border-white/10' },
  MIN_NOT_MET: { label: 'Mín. não atingido', cls: 'text-red-400 bg-red-400/10 border-red-400/20' },
}

interface EventPayoutTableProps {
  events: EventFinancial[]
}

export function EventPayoutTable({ events }: EventPayoutTableProps) {
  if (events.length === 0) {
    return (
      <div className="card-dark rounded-2xl p-10 text-center space-y-3">
        <BarChart2 className="size-9 mx-auto text-white/15" />
        <p className="text-sm text-white/40">Nenhum evento publicado ainda.</p>
        <p className="text-xs text-white/25">Crie um evento para ver suas receitas aqui.</p>
        <Link
          href="/eventos/novo"
          className="inline-block mt-1 px-4 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-medium hover:bg-primary/20 transition-colors"
        >
          Criar evento
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {events.map((event) => {
        const cfg = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.CLOSED
        return (
          <Link
            key={event.id}
            href={`/financeiro/${event.id}`}
            className="flex items-start gap-3 p-4 card-dark rounded-2xl hover:bg-white/[0.06] transition-colors block"
          >
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white truncate">{event.title}</p>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg border shrink-0 ${cfg.cls}`}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-xs text-white/35">{formatDate(event.starts_at)}</p>

              {event.capacity > 0 && (
                <div className="pt-1 space-y-1">
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min((event.confirmed_count / event.capacity) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wide">Inscritos</p>
                  <p className="text-sm font-medium text-white">{event.confirmed_count}/{event.capacity}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wide">Bruto</p>
                  <p className="text-sm font-medium text-white">{formatBalance(event.gross_revenue)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wide">Líquido</p>
                  <p className="text-sm font-medium text-primary">{formatBalance(event.net_revenue)}</p>
                </div>
              </div>

              {(event.platform_fees + event.gateway_fees) > 0 && (
                <p className="text-[10px] text-white/30">
                  Taxas: {formatBalance(event.platform_fees + event.gateway_fees)} (plataforma + gateway)
                </p>
              )}
            </div>

            <ChevronRight className="size-4 text-white/20 shrink-0 mt-0.5" />
          </Link>
        )
      })}
    </div>
  )
}
