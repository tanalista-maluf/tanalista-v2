import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GroupForm } from '@/features/grupos/components/GroupForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function NovoGrupoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/grupos" className="text-white/50 hover:text-white">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          Criar grupo
        </h1>
      </div>

      <p className="text-sm text-white/50">
        Ao criar um grupo você se torna o organizador dele e pode criar eventos para os membros.
      </p>

      <GroupForm />
    </main>
  )
}
