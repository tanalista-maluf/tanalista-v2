import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getGroupById, getGroupMembers } from '@/features/grupos/queries'
import { getEvents } from '@/features/eventos/queries'
import { EventCard } from '@/features/eventos/components/EventCard'
import { JoinGroupButton } from '@/features/grupos/components/JoinGroupButton'
import { LeaveGroupButton } from '@/features/grupos/components/LeaveGroupButton'
import { MemberList } from '@/features/grupos/components/MemberList'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, MapPin, Users, Lock, Settings, Plus, History, Calendar } from 'lucide-react'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: group } = await supabase
    .from('groups')
    .select('name, description, city, category, member_count')
    .eq('id', id)
    .maybeSingle()

  if (!group) return { title: 'Grupo não encontrado' }

  const description = group.description
    ?? `${group.member_count ?? 0} membros${group.city ? ` em ${group.city}` : ''}${group.category ? ` · ${group.category}` : ''}`

  return {
    title: group.name,
    description,
    openGraph: {
      title: `${group.name} — TáNaLista`,
      description,
    },
  }
}

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const group = await getGroupById(id, user.id)
  if (!group) notFound()

  const [members, upcomingResult, pastResult] = await Promise.all([
    getGroupMembers(id),
    getEvents({ userId: user.id, group_id: id, status: ['OPEN', 'CONFIRMED', 'PENDING'] }),
    getEvents({ userId: user.id, group_id: id, status: ['COMPLETED'], onlyMine: false }),
  ])
  const upcomingEvents = upcomingResult.events
  const pastEvents = pastResult.events.slice(0, 5)

  // Grupo privado: apenas membros podem ver
  if (group.visibility === 'PRIVATE' && !group.is_member) {
    return (
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12 text-center space-y-4">
        <Lock className="size-10 mx-auto text-white/50" />
        <h1 className="text-xl font-bold">Grupo privado</h1>
        <p className="text-white/50 text-sm">
          Este grupo é privado. Solicite ao dono para ser adicionado.
        </p>
        <Link href="/grupos" className={cn(buttonVariants({ variant: 'outline' }))}>
          Voltar para grupos
        </Link>
      </main>
    )
  }

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
      {/* Nav */}
      <div className="flex items-center gap-3">
        <Link href="/grupos" className="text-white/50 hover:text-white">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-bold truncate flex-1" style={{ fontFamily: 'var(--font-heading)' }}>
          {group.name}
        </h1>
        {group.is_owner && (
          <Link
            href={`/grupos/${id}/configuracoes`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
          >
            <Settings className="size-4" />
          </Link>
        )}
      </div>

      {/* Banner do grupo */}
      <div className="card-dark rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
            {group.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold">{group.name}</h2>
              {group.visibility === 'PRIVATE' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">
                  <Lock className="size-2.5" /> Privado
                </span>
              )}
              {group.category && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">{group.category}</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-white/50 mt-1">
              {group.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" /> {group.city}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="size-3.5" /> {group.member_count} membros
              </span>
            </div>
          </div>
        </div>

        {group.description && (
          <p className="text-sm text-white/50">{group.description}</p>
        )}

        {/* Ações */}
        <div className="flex gap-2 pt-1">
          {!group.is_member && <JoinGroupButton groupId={id} />}
          {group.is_member && !group.is_owner && <LeaveGroupButton groupId={id} />}
          {group.is_owner && (
            <Link
              href={`/eventos/novo?group_id=${id}`}
              className={cn(buttonVariants({ size: 'sm' }))}
            >
              <Plus className="size-4" />
              Criar evento
            </Link>
          )}
        </div>
      </div>

      {/* Próximos eventos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Próximos eventos</h3>
          {group.is_owner && (
            <Link href={`/eventos/novo?group_id=${id}`} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
              <Plus className="size-3.5" />Criar
            </Link>
          )}
        </div>
        {upcomingEvents.length === 0 ? (
          <div className="card-dark rounded-2xl p-6 text-center space-y-3">
            <Calendar className="size-8 mx-auto text-white/15" />
            <p className="text-sm text-white/30">Nenhum evento agendado.</p>
            {group.is_owner && (
              <Link
                href={`/eventos/novo?group_id=${id}`}
                className={cn(buttonVariants({ size: 'sm' }), 'mx-auto')}
              >
                <Plus className="size-3.5" />
                Criar primeiro evento
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((event) => {
              const e = event as any
              const participations = e.participations ?? []
              const confirmedCount = participations.filter((p: { status: string }) => p.status === 'CONFIRMED').length
              return (
                <EventCard key={e.id} event={e} confirmedCount={confirmedCount} groupName={group.name} />
              )
            })}
          </div>
        )}
      </section>

      {/* Eventos realizados */}
      {pastEvents.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <History className="size-4 text-white/30" />
            <h3 className="font-semibold text-white/60 text-sm">Realizados</h3>
          </div>
          <div className="space-y-2">
            {pastEvents.map((event) => {
              const e = event as any
              const participations = e.participations ?? []
              const confirmedCount = participations.filter((p: { status: string }) => p.status === 'CONFIRMED').length
              return (
                <EventCard key={e.id} event={e} confirmedCount={confirmedCount} groupName={group.name} />
              )
            })}
          </div>
        </section>
      )}

      {/* Membros */}
      <section className="space-y-3">
        <h3 className="font-semibold">Membros ({members.length})</h3>
        <MemberList
          members={members}
          isOwner={group.is_owner}
          groupId={id}
          currentUserId={user.id}
        />
      </section>
    </main>
  )
}
