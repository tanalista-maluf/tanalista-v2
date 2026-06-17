import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { EventForm } from '@/features/eventos/components/EventForm'
import Link from 'next/link'
import { ChevronLeft, Users, Lock, Globe, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

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

  // Buscar todos os grupos onde o usuário é membro
  const { data: memberships } = await supabase
    .from('group_members')
    .select('role, groups(id, name, slug, visibility, member_count, category)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  const groups = (memberships ?? [])
    .map((m: any) => ({ ...m.groups, role: m.role }))
    .filter(Boolean) as {
      id: string
      name: string
      slug: string | null
      visibility: string
      member_count: number
      category: string | null
      role: string
    }[]

  // Se não tem nenhum grupo, mostra mensagem
  if (groups.length === 0) {
    return (
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-12 text-center space-y-5">
        <Users className="size-10 mx-auto text-white/20" />
        <div>
          <h1 className="text-xl font-bold text-white">Nenhum grupo encontrado</h1>
          <p className="text-sm text-white/40 mt-1">Você precisa fazer parte de um grupo para criar eventos.</p>
        </div>
        <Link href="/grupos" className={cn(buttonVariants())}>
          <Plus className="size-4" />
          Criar ou entrar em um grupo
        </Link>
      </main>
    )
  }

  // Se veio com group_id na URL, valida e vai direto ao formulário
  if (groupId) {
    const group = groups.find(g => g.id === groupId)
    if (!group) notFound()

    return (
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/grupos/${group.slug ?? groupId}`} className="text-white/50 hover:text-white">
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
              Criar evento
            </h1>
            <p className="text-xs text-white/50">em {group.name}</p>
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

  // Se tem só 1 grupo, redireciona direto
  if (groups.length === 1) {
    redirect(`/eventos/novo?group_id=${groups[0].id}`)
  }

  // Seletor de grupo (2 ou mais grupos)
  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/eventos" className="text-white/50 hover:text-white">
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            Criar evento
          </h1>
          <p className="text-xs text-white/50">Escolha o grupo para publicar</p>
        </div>
      </div>

      <div className="space-y-2">
        {groups.map(group => (
          <Link
            key={group.id}
            href={`/eventos/novo?group_id=${group.id}`}
            className="flex items-center gap-4 card-dark rounded-2xl px-5 py-4 border border-white/[0.07] hover:border-primary/30 transition-colors group"
          >
            {/* Avatar */}
            <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {group.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm truncate">{group.name}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-white/35">
                {group.visibility === 'PRIVATE'
                  ? <span className="flex items-center gap-1"><Lock className="size-3" /> Privado</span>
                  : <span className="flex items-center gap-1"><Globe className="size-3" /> Público</span>
                }
                <span>·</span>
                <span className="flex items-center gap-1"><Users className="size-3" /> {group.member_count} membros</span>
                {group.role === 'OWNER' && (
                  <>
                    <span>·</span>
                    <span className="text-primary/60 font-medium">Dono</span>
                  </>
                )}
              </div>
            </div>

            <ChevronRight className="size-4 text-white/20 group-hover:text-primary/50 transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </main>
  )
}
