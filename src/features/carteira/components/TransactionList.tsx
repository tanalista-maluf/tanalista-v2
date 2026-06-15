import { ArrowDownLeft, ArrowUpRight, RefreshCw, Wallet } from 'lucide-react'
import { formatBalance, formatDateTime } from '@/utils/format'

interface Transaction {
  id: string
  type: string
  amount: number
  balance_after: number
  description: string | null
  created_at: string
}

interface TransactionListProps {
  transactions: Transaction[]
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof ArrowDownLeft; isCredit: boolean }> = {
  DEPOSIT: { label: 'Recarga', icon: ArrowDownLeft, isCredit: true },
  PAYMENT: { label: 'Pagamento', icon: ArrowUpRight, isCredit: false },
  REFUND: { label: 'Estorno', icon: RefreshCw, isCredit: true },
  WITHDRAWAL: { label: 'Saque', icon: ArrowUpRight, isCredit: false },
  PAYOUT: { label: 'Repasse', icon: ArrowDownLeft, isCredit: true },
}

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-white/30">
        <Wallet className="size-10 opacity-30" />
        <p className="text-sm">Nenhuma movimentação ainda.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {transactions.map((tx) => {
        const config = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.PAYMENT
        const Icon = config.icon
        const { isCredit } = config

        return (
          <div
            key={tx.id}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${isCredit ? 'bg-primary/10 border border-primary/20' : 'bg-red-400/10 border border-red-400/20'}`}>
              <Icon className={`size-4 ${isCredit ? 'text-primary' : 'text-red-400'}`} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{config.label}</p>
              {tx.description && (
                <p className="text-xs text-white/40 truncate">{tx.description}</p>
              )}
              <p className="text-xs text-white/30">{formatDateTime(tx.created_at)}</p>
            </div>

            <div className="text-right shrink-0">
              <p className={`text-sm font-semibold ${isCredit ? 'text-primary' : 'text-red-400'}`}>
                {isCredit ? '+' : '−'} {formatBalance(tx.amount)}
              </p>
              <p className="text-xs text-white/30">
                Saldo: {formatBalance(tx.balance_after)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
