import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProfileForm } from '@/features/perfil/components/ProfileForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function DadosPessoaisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/perfil" className="text-white/40 hover:text-white transition-colors">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-bold text-white">Dados pessoais</h1>
      </div>

      <div className="card-dark rounded-2xl p-4">
        <ProfileForm profile={profile} />
      </div>
    </main>
  )
}
