import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DepositForm } from '@/features/carteira/components/DepositForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DepositoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verificar se existe um PIX pendente recente (últimos 30 min)
  const admin = createAdminClient()
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { data: pendingPayment } = await admin
    .from('payments')
    .select('id, amount, gateway_response, created_at')
    .eq('payer_id', user.id)
    .eq('status', 'PENDING')
    .eq('method', 'PIX')
    .is('participation_id', null) // depósitos não têm participation_id
    .gte('created_at', thirtyMinAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let pendingPix: { qr_code: string; qr_code_base64: string; amount: number; expires_at: string } | null = null
  if (pendingPayment) {
    const resp = pendingPayment.gateway_response as any
    const pixData = resp?.point_of_interaction?.transaction_data
    if (pixData?.qr_code) {
      pendingPix = {
        qr_code: pixData.qr_code,
        qr_code_base64: pixData.qr_code_base64 ?? '',
        amount: pendingPayment.amount,
        expires_at: new Date(new Date(pendingPayment.created_at).getTime() + 30 * 60 * 1000).toISOString(),
      }
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/carteira" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Adicionar saldo</h1>
          <p className="text-sm text-white/50">Recarregue sua carteira via PIX</p>
        </div>
      </div>

      <DepositForm pendingPix={pendingPix} />
    </main>
  )
}
