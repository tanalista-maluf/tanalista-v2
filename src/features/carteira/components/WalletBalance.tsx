import { TrendingUp, ArrowDownLeft } from 'lucide-react'
import Link from 'next/link'
import { formatBalance } from '@/utils/format'

interface WalletBalanceProps {
  balance: number
}

export function WalletBalance({ balance }: WalletBalanceProps) {
  return (
    <div className="wallet-gradient rounded-2xl p-5">
      <p className="text-xs text-white/50 mb-1">Saldo disponível</p>
      <p className="text-4xl font-bold text-primary tracking-tight">{formatBalance(balance)}</p>
      <p className="text-xs text-white/35 mt-1">Disponível para uso em eventos</p>

      <div className="flex gap-2 mt-4">
        <Link
          href="/carteira/deposito"
          className="flex-1 py-2.5 rounded-xl text-center text-sm font-semibold bg-primary text-background hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
        >
          <ArrowDownLeft className="size-4" />
          Adicionar
        </Link>
        {balance >= 1000 ? (
          <Link
            href="/carteira/saque"
            className="flex-1 py-2.5 rounded-xl text-center text-sm font-semibold bg-white/10 text-primary border border-primary/20 hover:bg-white/15 transition-colors flex items-center justify-center gap-1.5"
          >
            <TrendingUp className="size-4" />
            Sacar
          </Link>
        ) : (
          <span
            title="Saldo mínimo para saque: R$ 10,00"
            className="flex-1 py-2.5 rounded-xl text-center text-sm font-semibold bg-white/4 text-white/20 border border-white/6 cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <TrendingUp className="size-4" />
            Sacar
          </span>
        )}
      </div>
    </div>
  )
}
