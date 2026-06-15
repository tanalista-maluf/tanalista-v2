import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWalletData, getWalletTransactions } from '@/features/carteira/queries'
import { WalletBalance } from '@/features/carteira/components/WalletBalance'
import { TransactionList } from '@/features/carteira/components/TransactionList'
import { RedeemCouponForm } from '@/features/cupons/components/RedeemCouponForm'

export default async function CarteiraPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [wallet, txResult] = await Promise.all([
    getWalletData(),
    getWalletTransactions(20),
  ])

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
          Carteira
        </h1>
        <p className="text-sm text-white/40">Gerencie seu saldo e movimentações</p>
      </div>

      <WalletBalance balance={wallet?.balance ?? 0} />

      <RedeemCouponForm />

      <div>
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-3">Histórico</h2>
        <div className="card-dark rounded-2xl p-2">
          <TransactionList transactions={txResult.items as any} />
        </div>
      </div>
    </main>
  )
}
