import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { EventForm } from '@/features/eventos/components/EventForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface Prefill {
  group_id?: string
  title?: string
  address?: string
  city?: string
  price?: string
  capacity?: string
  min_participants?: string
}

export default async function NovoEventoPage({
  searchParams,
}: {
  searchParams: Promise<Prefill>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const groupId = params.group_id

  if (!groupId) {
    // Redireciona para seleção de grupo
    redirect('/grupos?tab=meus')
  }

  // Verificar que o usuário é membro do grupo
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) notFound()

  const { data: group } = await supabase
    .from('groups')
    .select('name')
    .eq('id', groupId)
    .single()

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/grupos/${groupId}`} className="text-white/50 hover:text-white">
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            Criar evento
          </h1>
          {group && (
            <p className="text-xs text-white/50">em {group.name}</p>
          )}
        </div>
      </div>

      <EventForm
        groupId={groupId}
        defaultValues={{
          title: params.title,
          address: params.address,
          city: params.city,
          price: params.price ? (Number(params.price) / 100).toFixed(2) : undefined,
          capacity: params.capacity ? Number(params.capacity) : undefined,
          min_participants: params.min_participants ? Number(params.min_participants) : undefined,
        }}
      />
    </main>
  )
}
