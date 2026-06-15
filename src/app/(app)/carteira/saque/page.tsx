import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWalletData } from '@/features/carteira/queries'
import { WithdrawalForm } from '@/features/carteira/components/WithdrawalForm'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function SaquePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const wallet = await getWalletData()
  const balance = wallet?.balance ?? 0

  if (balance < 1000) {
    return (
      <main className="max-w-md mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/carteira" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-xl font-bold">Sacar saldo</h1>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
          <AlertCircle className="size-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm">
            Saldo mínimo para saque: <strong>R$ 10,00</strong>. Adicione saldo à sua carteira para sacar.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/carteira" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Sacar saldo</h1>
          <p className="text-sm text-white/50">Transferência via PIX em até 2 dias úteis</p>
        </div>
      </div>

      <WithdrawalForm balance={balance} />
    </main>
  )
}
