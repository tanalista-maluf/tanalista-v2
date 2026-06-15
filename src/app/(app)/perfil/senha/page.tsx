import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SecurityForm } from '@/features/perfil/components/SecurityForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function SenhaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/perfil" className="text-white/40 hover:text-white transition-colors">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-bold text-white">Senha e segurança</h1>
      </div>

      <div className="card-dark rounded-2xl p-4">
        <SecurityForm currentEmail={user.email ?? ''} />
      </div>
    </main>
  )
}
