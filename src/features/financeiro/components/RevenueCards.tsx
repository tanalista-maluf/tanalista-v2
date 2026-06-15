import { TrendingUp, DollarSign, Receipt, Calendar } from 'lucide-react'
import { formatBalance } from '@/utils/format'

interface RevenueCardsProps {
  totalGross: number
  totalNet: number
  totalFees: number
  totalEvents: number
}

export function RevenueCards({ totalGross, totalNet, totalFees, totalEvents }: RevenueCardsProps) {
  const cards = [
    { label: 'Receita bruta', value: formatBalance(totalGross), icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
    { label: 'Receita líquida', value: formatBalance(totalNet), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
    { label: 'Total em taxas', value: formatBalance(totalFees), icon: Receipt, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
    { label: 'Eventos criados', value: String(totalEvents), icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => {
        const Icon = c.icon
        return (
          <div key={c.label} className="card-dark rounded-2xl p-4 space-y-2">
            <div className={`size-9 rounded-xl flex items-center justify-center border ${c.bg}`}>
              <Icon className={`size-4 ${c.color}`} />
            </div>
            <p className="text-xs text-white/40">{c.label}</p>
            <p className="text-lg font-bold text-white">{c.value}</p>
          </div>
        )
      })}
    </div>
  )
}
