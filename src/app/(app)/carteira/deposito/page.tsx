import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DepositForm } from '@/features/carteira/components/DepositForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function DepositoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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

      <DepositForm />
    </main>
  )
}
