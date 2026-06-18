import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import { UserAvatar } from '@/components/ui/user-avatar'
import { EventCard } from '@/features/eventos/components/EventCard'
import { MapPin, Calendar, Users, Star, ChevronLeft } from 'lucide-react'
import { formatDate } from '@/utils/format'
import Link from 'next/link'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, bio, city, avatar_url')
    .eq('username', username)
    .maybeSingle()

  if (!profile) return { title: 'Perfil não encontrado' }

  const name = profile.full_name ?? `@${username}`
  const description = profile.bio
    ?? `${name}${profile.city ? ` · ${profile.city}` : ''} no TáNaLista`

  return {
    title: `@${username}`,
    description,
    openGraph: {
      title: `${name} (@${username}) — TáNaLista`,
      description,
      images: profile.avatar_url ? [profile.avatar_url] : [],
    },
  }
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) redirect('/login')

  const { username } = await params
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, full_name, username, avatar_url, city, created_at, bio')
    .eq('username', username)
    .maybeSingle()

  if (!profile) notFound()

  // Busca em paralelo
  const [
    { data: organizedEvents },
    { data: groupMemberships },
    { count: totalEventsOrganized },
    { data: participationRows },
    { data: ratingsData },
    { count: totalParticipations },
  ] = await Promise.all([
    // Eventos organizados
    admin
      .from('events')
      .select('*, groups(name), participations(status)')
      .eq('organizer_id', profile.id)
      .in('status', ['OPEN', 'CONFIRMED', 'COMPLETED'])
      .order('starts_at', { ascending: false })
      .limit(6),

    // Grupos
    admin
      .from('group_members')
      .select('groups(id, name, category, city)')
      .eq('user_id', profile.id)
      .limit(6),

    // Total eventos realizados como organizador
    admin
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('organizer_id', profile.id)
      .eq('status', 'COMPLETED'),

    // Últimas 5 participações confirmadas (como participante, não organizador)
    admin
      .from('participations')
      .select('event_id, created_at, events(id, title, starts_at, status, category, capacity, groups(name), participations(status))')
      .eq('user_id', profile.id)
      .eq('status', 'CONFIRMED')
      .order('created_at', { ascending: false })
      .limit(5),

    // Avaliação média dos eventos que organizou
    admin
      .from('event_ratings')
      .select('rating, events!inner(organizer_id)')
      .eq('events.organizer_id', profile.id),

    // Total de eventos que participou
    admin
      .from('participations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('status', 'CONFIRMED'),
  ])

  // Filtra participações de eventos que a pessoa não organizou
  const attendedEvents = (participationRows ?? [])
    .map((p: any) => p.events)
    .filter((e: any) => e && e.organizer_id !== profile.id)
    .slice(0, 5)

  // Média de avaliação como organizador
  const ratings = (ratingsData ?? []).map((r: any) => r.rating).filter(Boolean)
  const avgRating = ratings.length > 0
    ? Math.round((ratings.reduce((s: number, r: number) => s + r, 0) / ratings.length) * 10) / 10
    : null

  const totalEvents = totalEventsOrganized ?? 0
  const isOwnProfile = currentUser.id === profile.id

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
      {/* Nav */}
      <div className="flex items-center gap-3">
        <Link href="/eventos" className="text-white/40 hover:text-white">
          <ChevronLeft className="size-5" />
        </Link>
        <span className="text-white/40 text-sm">Perfil público</span>
        {isOwnProfile && (
          <Link href="/perfil" className="ml-auto text-xs text-primary hover:underline">
            Editar perfil
          </Link>
        )}
      </div>

      {/* Header */}
      <div className="card-dark rounded-2xl p-6 flex items-start gap-4">
        <UserAvatar
          name={profile.full_name ?? profile.username ?? '?'}
          avatarUrl={profile.avatar_url}
          size="lg"
        />
        <div className="flex-1 min-w-0 space-y-1">
          <h1 className="text-lg font-bold text-white">{profile.full_name ?? profile.username}</h1>
          <p className="text-sm text-white/40">@{profile.username}</p>
          {profile.city && (
            <p className="flex items-center gap-1 text-xs text-white/35">
              <MapPin className="size-3" /> {profile.city}
            </p>
          )}
          {profile.bio && (
            <p className="text-sm text-white/60 pt-1">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="card-dark rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-white">{totalEvents}</p>
          <p className="text-[10px] text-white/35 mt-0.5 leading-tight">Eventos organizados</p>
        </div>
        <div className="card-dark rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-white">{totalParticipations ?? 0}</p>
          <p className="text-[10px] text-white/35 mt-0.5 leading-tight">Participações</p>
        </div>
        <div className="card-dark rounded-2xl p-3 text-center">
          <p className="text-xl font-bold text-white">{groupMemberships?.length ?? 0}</p>
          <p className="text-[10px] text-white/35 mt-0.5 leading-tight">Grupos</p>
        </div>
        <div className="card-dark rounded-2xl p-3 text-center">
          <p className="flex items-center justify-center gap-1 text-xl font-bold text-white">
            {avgRating !== null ? (
              <><Star className="size-3.5 text-yellow-400 fill-yellow-400" />{avgRating}</>
            ) : (
              <span className="text-white/25">—</span>
            )}
          </p>
          <p className="text-[10px] text-white/35 mt-0.5 leading-tight">Avaliação</p>
        </div>
      </div>

      {/* Eventos organizados */}
      {(organizedEvents?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest flex items-center gap-2">
            <Calendar className="size-3.5" /> Eventos
          </h2>
          <div className="space-y-2">
            {organizedEvents!.map((event) => {
              const e = event as any
              const confirmedCount = e.confirmed_count ?? 0
              return (
                <EventCard key={e.id} event={e} confirmedCount={confirmedCount} groupName={e.groups?.name} />
              )
            })}
          </div>
        </section>
      )}

      {/* Eventos participados */}
      {attendedEvents.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest flex items-center gap-2">
            <Users className="size-3.5" /> Participou
          </h2>
          <div className="space-y-2">
            {attendedEvents.map((event: any) => {
              const confirmedCount = event.confirmed_count ?? 0
              return (
                <EventCard key={event.id} event={event} confirmedCount={confirmedCount} groupName={event.groups?.name} />
              )
            })}
          </div>
        </section>
      )}

      {/* Grupos */}
      {(groupMemberships?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest flex items-center gap-2">
            <Users className="size-3.5" /> Grupos
          </h2>
          <div className="space-y-2">
            {groupMemberships!.map((m: any) => {
              const g = m.groups
              if (!g) return null
              return (
                <Link
                  key={g.id}
                  href={`/grupos/${g.slug ?? g.id}`}
                  className="flex items-center gap-3 card-dark rounded-2xl p-4 hover:bg-white/[0.06] transition-colors"
                >
                  <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{g.name}</p>
                    {(g.category || g.city) && (
                      <p className="text-xs text-white/35">
                        {[g.category, g.city].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Membro desde */}
      <p className="text-center text-xs text-white/20 pb-4">
        Membro desde {formatDate(profile.created_at)}
      </p>
    </main>
  )
}
