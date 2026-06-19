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
import { ChevronLeft, MapPin, Users, Lock, Settings, Plus, History, Calendar, Link2, ShoppingBag } from 'lucide-react'
import Image from 'next/image'
import { InviteButton } from '@/features/grupos/components/InviteButton'
import { RequestGroupJoinButton } from '@/features/grupos/components/RequestGroupJoinButton'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: group } = await supabase
    .from('groups')
    .select('name, description, city, category, member_count')
    .eq(UUID_RE.test(slug) ? 'id' : 'slug', slug)
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
  params: Promise<{ slug: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { slug } = await params
  const group = await getGroupById(slug, user.id)
  if (!group) notFound()

  // Canonical slug redirect: if URL uses UUID but group has slug, redirect
  if (UUID_RE.test(slug) && group.slug && group.slug !== slug) {
    redirect(`/grupos/${group.slug}`)
  }

  const groupSlug = group.slug ?? group.id

  // Check existing join request for private groups
  let existingJoinRequest: { status: string } | null = null
  if (group.visibility === 'PRIVATE' && !group.is_member) {
    const admin = createAdminClient()
    const { data: req } = await admin
      .from('group_join_requests')
      .select('status')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .maybeSingle()
    existingJoinRequest = req
  }

  const isPrivateNonMember = group.visibility === 'PRIVATE' && !group.is_member

  const [members, upcomingResult, pastResult] = await Promise.all([
    isPrivateNonMember ? Promise.resolve([]) : getGroupMembers(group.id),
    isPrivateNonMember ? Promise.resolve({ events: [] }) : getEvents({ userId: user.id, group_id: group.id, status: ['OPEN', 'CONFIRMED', 'PENDING'] }),
    isPrivateNonMember ? Promise.resolve({ events: [] }) : getEvents({ userId: user.id, group_id: group.id, status: ['COMPLETED'], onlyMine: false }),
  ])
  const upcomingEvents = upcomingResult.events
  const pastEvents = (pastResult as any).events?.slice(0, 5) ?? []

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
            href={`/grupos/${groupSlug}/configuracoes`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
          >
            <Settings className="size-4" />
          </Link>
        )}
      </div>

      {/* Banner do grupo */}
      <div className="card-dark rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="relative w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-2xl shrink-0 overflow-hidden">
            {group.avatar_url ? (
              <Image src={group.avatar_url} alt={group.name} fill className="object-cover" />
            ) : (
              group.name.charAt(0).toUpperCase()
            )}
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
          {!group.is_member && group.visibility === 'PUBLIC' && <JoinGroupButton groupId={group.id} />}
          {!group.is_member && group.visibility === 'PRIVATE' && (
            <RequestGroupJoinButton
              groupId={group.id}
              existingStatus={existingJoinRequest?.status as 'PENDING' | 'REJECTED' | null}
            />
          )}
          {group.is_member && !group.is_owner && <LeaveGroupButton groupId={group.id} />}
          {group.is_owner && (
            <Link
              href={`/eventos/novo?group_id=${group.id}`}
              className={cn(buttonVariants({ size: 'sm' }))}
            >
              <Plus className="size-4" />
              Criar evento
            </Link>
          )}
        </div>

        {/* Link de convite — apenas dono de grupo privado */}
        {group.is_owner && group.visibility === 'PRIVATE' && (group as any).invite_token && (
          <div className="pt-2 border-t border-white/[0.06] space-y-2">
            <p className="text-xs font-semibold text-white/40 flex items-center gap-1.5">
              <Link2 className="size-3.5" />
              Link de convite
            </p>
            <InviteButton groupId={group.id} inviteToken={(group as any).invite_token} />
          </div>
        )}
      </div>

      {/* Marketplace — only visible to members */}
      {group.is_member && (
        <Link
          href={`/grupos/${groupSlug}/marketplace`}
          className="flex items-center justify-between card-dark rounded-2xl px-5 py-4 hover:border-primary/20 border border-white/[0.07] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShoppingBag className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Marketplace</p>
              <p className="text-xs text-white/40">Compra, venda e troca entre membros</p>
            </div>
          </div>
          <ChevronLeft className="size-4 text-white/30 rotate-180" />
        </Link>
      )}

      {/* Conteúdo restrito para não-membros de grupos privados */}
      {isPrivateNonMember ? (
        <div className="card-dark rounded-2xl p-6 text-center space-y-2">
          <Lock className="size-8 mx-auto text-white/20" />
          <p className="text-sm text-white/30">Conteúdo visível apenas para membros.</p>
        </div>
      ) : (
        <>
          {/* Próximos eventos */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Próximos eventos</h3>
              {group.is_owner && (
                <Link href={`/eventos/novo?group_id=${group.id}`} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
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
                    href={`/eventos/novo?group_id=${group.id}`}
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
                  const confirmedCount = e.confirmed_count ?? 0
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
                {(pastEvents as any[]).map((event) => {
                  const e = event as any
                  const confirmedCount = e.confirmed_count ?? 0
                  return (
                    <EventCard key={e.id} event={e} confirmedCount={confirmedCount} groupName={group.name} />
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* Membros — hidden for private non-members */}
      {!isPrivateNonMember && (
        <section className="space-y-3">
          <h3 className="font-semibold">Membros ({members.length})</h3>
          <MemberList
            members={members}
            isOwner={group.is_owner}
            groupId={group.id}
            currentUserId={user.id}
          />
        </section>
      )}
    </main>
  )
}
