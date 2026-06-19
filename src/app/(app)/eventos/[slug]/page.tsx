import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getEventById } from '@/features/eventos/queries'
import { EventStatusBadge } from '@/features/eventos/components/EventStatusBadge'
import { EventRules } from '@/features/eventos/components/EventRules'
import { OrganizerActions } from '@/features/eventos/components/OrganizerActions'
import { ParticipantCTA } from '@/features/eventos/components/ParticipantCTA'
import { formatDateTime, formatPrice } from '@/utils/format'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ParticipantList } from '@/features/participacoes/components/ParticipantList'
import { CheckInScanner } from '@/features/eventos/components/CheckInScanner'
import { CheckInList } from '@/features/eventos/components/CheckInList'
import { EventMural } from '@/features/mural/components/EventMural'
import { getEventComments } from '@/features/mural/queries'
import { getEventPolls } from '@/features/mural/queries-polls'
import { ShareEventButton } from '@/features/eventos/components/ShareEventButton'
import { AddToCalendar } from '@/features/eventos/components/AddToCalendar'
import { ParticipantQRCode } from '@/features/eventos/components/ParticipantQRCode'
import { EventRating } from '@/features/avaliacoes/components/EventRating'
import { getEventRatingSummary, getUserRating } from '@/features/avaliacoes/actions'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft, MapPin, Calendar, Users, Clock, QrCode, MessageSquare, Star, Images, Navigation, ListOrdered, Link2, Globe, UserCheck } from 'lucide-react'
import { EventInviteButton } from '@/features/eventos/components/EventInviteButton'
import { ChangeTeamButton } from '@/features/eventos/components/ChangeTeamButton'
import { EventGallery } from '@/features/galeria/components/EventGallery'
import { getEventPhotos, getEventStorageUsage } from '@/features/galeria/queries'
import { WaitlistManagement } from '@/features/fila/components/WaitlistManagement'
import { WaitlistStatus } from '@/features/fila/components/WaitlistStatus'
import { RequestEventJoinButton } from '@/features/eventos/components/RequestEventJoinButton'
import { EventJoinRequests } from '@/features/eventos/components/EventJoinRequests'
import { createAdminClient } from '@/lib/supabase/admin'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Suspense } from 'react'

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ invite?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { slug } = await params
  const { invite: inviteToken } = await searchParams

  // Busca evento por slug ou UUID; extrai UUID para queries subsequentes
  const event = await getEventById(slug, user.id)
  if (!event) notFound()

  // Canonical redirect: se veio com UUID e existe slug, redireciona
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i
  if (UUID_RE.test(slug) && event.slug && event.slug !== slug) redirect(`/eventos/${event.slug}`)

  const id = event.id // UUID para queries
  const eventSlug = event.slug ?? event.id // slug para URLs

  const [initialComments, initialPolls, ratingSummary, photos, storageUsage, { data: teamsRaw }] = await Promise.all([
    getEventComments(id),
    getEventPolls(id, user.id),
    getEventRatingSummary(id),
    getEventPhotos(id),
    getEventStorageUsage(id),
    supabase.from('event_teams').select('id, name, capacity, position').eq('event_id', id).order('position'),
  ])

  // Bloquear acesso a eventos restritos sem permissão
  const eventVisibility = (event as any).visibility ?? 'PUBLIC'
  if (!event.is_organizer && eventVisibility !== 'PUBLIC') {
    const isMember = event.user_participation_status !== null || event.is_organizer
    if (eventVisibility === 'GROUP') {
      // Verificar membership no grupo
      const { data: membership } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', event.group_id ?? '')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!membership) {
        return (
          <main className="flex-1 flex items-center justify-center px-4 py-16">
            <div className="max-w-sm w-full card-dark rounded-2xl p-8 text-center space-y-4">
              <UserCheck className="size-10 mx-auto text-white/30" />
              <p className="text-lg font-bold text-white">Evento restrito</p>
              <p className="text-sm text-white/40">Este evento é visível apenas para membros do grupo.</p>
              <Link href="/eventos" className={cn(buttonVariants({ variant: 'outline' }), 'border-white/10')}>Ver eventos</Link>
            </div>
          </main>
        )
      }
    }
    if (eventVisibility === 'INVITE') {
      const validToken = (event as any).invite_token && inviteToken === (event as any).invite_token
      if (!validToken && !isMember) {
        return (
          <main className="flex-1 flex items-center justify-center px-4 py-16">
            <div className="max-w-sm w-full card-dark rounded-2xl p-8 text-center space-y-4">
              <Link2 className="size-10 mx-auto text-white/30" />
              <p className="text-lg font-bold text-white">Acesso por convite</p>
              <p className="text-sm text-white/40">Você precisa de um link de convite para acessar este evento.</p>
              <Link href="/eventos" className={cn(buttonVariants({ variant: 'outline' }), 'border-white/10')}>Ver eventos</Link>
            </div>
          </main>
        )
      }
    }
  }

  const spotsLeft = event.capacity - event.confirmed_count
  const isFull = spotsLeft <= 0
  const isOpen = event.status === 'OPEN'
  const canJoin = isOpen && !isFull && !event.user_participation_status && !event.is_organizer

  // Join request for non-PUBLIC events
  const eventVisibilityField = (event as any).visibility ?? 'PUBLIC'
  const admin = createAdminClient()
  let existingJoinRequest: { status: string } | null = null
  if (eventVisibilityField !== 'PUBLIC' && !event.is_organizer && !event.user_participation_status) {
    const { data: req } = await admin
      .from('event_join_requests')
      .select('status')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    existingJoinRequest = req
  }

  // Join requests list for organizers of non-public events
  let joinRequests: { id: string; user_id: string; status: string; created_at: string; profiles: { full_name: string | null; username: string | null; avatar_url: string | null } | null }[] = []
  if (event.is_organizer && eventVisibilityField !== 'PUBLIC') {
    const { data } = await admin
      .from('event_join_requests')
      .select('id, user_id, status, created_at, profiles(full_name, username, avatar_url)')
      .eq('event_id', id)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
    joinRequests = (data ?? []) as any
  }
  // Organizador pode participar como inscrito — verifica se já tem participação
  const organizerParticipationStatus = event.is_organizer ? event.user_participation_status : null
  const organizerCanJoin = event.is_organizer && isOpen && !isFull && !organizerParticipationStatus

  const isConfirmedParticipant = event.user_participation_status === 'CONFIRMED'
  const isFinished = event.status === 'COMPLETED'
  const canRate = isConfirmedParticipant && isFinished
  const canUploadPhoto = isConfirmedParticipant || event.is_organizer
  const userRating = canRate ? await getUserRating(id, user.id) : null

  // Fila de espera
  const isOnWaitlist = !event.user_participation_status && !event.is_organizer && event.waitlist_position !== null
  let waitlistEntry: { id: string; status: string; position: number; notified_at: string | null; expires_at: string | null; team_id: string | null } | null = null
  if (isOnWaitlist) {
    const { data: we } = await supabase
      .from('waitlist_entries')
      .select('id, status, position, notified_at, expires_at, team_id')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .in('status', ['WAITING', 'NOTIFIED'])
      .maybeSingle()
    waitlistEntry = we
  }

  // Enriquecer times com contagem de confirmados
  let teams: { id: string; name: string; capacity: number; confirmed_count: number }[] = []
  if (teamsRaw && teamsRaw.length > 0) {
    const counts = await Promise.all(
      teamsRaw.map(async (t) => {
        const { count } = await supabase
          .from('participations')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', t.id)
          .eq('status', 'CONFIRMED')
        return { ...t, confirmed_count: count ?? 0 }
      })
    )
    teams = counts
  }

  // Time atual do usuário (para participante confirmado)
  const userTeam = (event as any).user_team_id
    ? teams.find((t) => t.id === (event as any).user_team_id) ?? null
    : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const group = (event as any).groups
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const organizer = (event as any)['profiles']

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full">
      {/* Hero com gradiente */}
      <div className="relative px-4 pt-4 pb-5" style={{ background: 'radial-gradient(ellipse 120% 100% at 50% -10%, rgba(74,222,128,0.07) 0%, transparent 65%)' }}>
        {/* Nav */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link href="/eventos" className="size-8 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <ChevronLeft className="size-4" />
            </Link>
            {group && (
              <Link href={`/grupos/${event.group_id}`} className="text-[12px] font-semibold text-primary/80 hover:text-primary transition-colors">
                {group.name}
              </Link>
            )}
          </div>
        </div>

        {/* Categoria + Status */}
        <div className="flex items-center gap-2 mb-2">
          {event.category && (
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-primary/60 bg-primary/8 border border-primary/15 px-2.5 py-1 rounded-full">
              {event.category}
            </span>
          )}
          <EventStatusBadge status={event.status} />
        </div>

        {/* Título */}
        <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-white" style={{ fontFamily: 'var(--font-heading)' }}>
          {event.title}
        </h1>

        {/* Meta strip */}
        <div className="mt-4 grid grid-cols-3 divide-x divide-white/[0.06] border border-white/[0.06] rounded-2xl overflow-hidden bg-white/[0.02]">
          <div className="px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-white/30">Data</p>
            <p className="text-[12px] font-bold text-white mt-0.5">{format(new Date(event.starts_at), "dd/MM", { locale: ptBR })}</p>
            <p className="text-[10px] text-white/40">{format(new Date(event.starts_at), "EEEE", { locale: ptBR })}</p>
          </div>
          <div className="px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-white/30">Horário</p>
            <p className="text-[12px] font-bold text-white mt-0.5">{format(new Date(event.starts_at), "HH:mm")}</p>
            {event.ends_at && <p className="text-[10px] text-white/40">até {format(new Date(event.ends_at), "HH:mm")}</p>}
          </div>
          <div className="px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-white/30">Vagas</p>
            <p className="text-[12px] font-bold text-white mt-0.5">{Math.max(0, event.capacity - event.confirmed_count)}</p>
            <p className="text-[10px] text-white/40">{event.confirmed_count}/{event.capacity}</p>
          </div>
        </div>

        {/* Barra de capacidade */}
        <div className="mt-3">
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                event.confirmed_count >= event.capacity ? 'bg-red-400' :
                event.confirmed_count / event.capacity >= 0.8 ? 'bg-yellow-400' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(100, (event.confirmed_count / event.capacity) * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-white/35">
              <MapPin className="size-3 shrink-0" />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.address}, ${event.city}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                {event.address}, {event.city}
              </a>
            </div>
            {event.waitlist_count > 0 && (
              <span className="text-[10px] text-white/30">{event.waitlist_count} na fila</span>
            )}
          </div>

          {/* Ações rápidas */}
          <div className="flex items-center justify-end gap-2 mt-3">
            <AddToCalendar
              title={event.title}
              description={event.description ?? ''}
              startsAt={event.starts_at}
              endsAt={event.ends_at}
              address={event.address}
              city={event.city}
              eventId={id}
            />
            <ShareEventButton eventId={eventSlug} />
          </div>
        </div>

        {/* Preço + CTA */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-white/30">por pessoa</p>
            <p className="text-[28px] font-extrabold text-primary tracking-tight leading-none mt-0.5">{formatPrice(event.price)}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {event.is_organizer ? (
              <>
                <OrganizerActions event={{
                  id: event.id,
                  status: event.status,
                  title: event.title,
                  group_id: event.group_id ?? undefined,
                  address: event.address ?? undefined,
                  city: event.city ?? undefined,
                  price: event.price,
                  capacity: event.capacity,
                  min_participants: event.min_participants,
                }} />
                {/* Organizador também pode se inscrever como participante */}
                {organizerCanJoin && (
                  <Link
                    href={`/eventos/${eventSlug}/inscricao`}
                    className="text-xs text-white/40 hover:text-primary transition-colors underline underline-offset-2"
                  >
                    Participar também
                  </Link>
                )}
                {organizerParticipationStatus && (
                  <span className="text-xs text-primary/70 flex items-center gap-1">
                    <UserCheck className="size-3" />
                    {organizerParticipationStatus === 'CONFIRMED' ? 'Você está inscrito' : 'Inscrição pendente'}
                  </span>
                )}
              </>
            ) : eventVisibilityField !== 'PUBLIC' && !event.user_participation_status ? (
              <RequestEventJoinButton
                eventId={id}
                existingStatus={existingJoinRequest?.status as 'PENDING' | 'REJECTED' | null}
              />
            ) : (
              <ParticipantCTA
                event={event}
                canJoin={canJoin}
                isFull={isFull}
                userId={user.id}
              />
            )}
          </div>
        </div>

        {/* Prazo */}
        {isOpen && (
          <p className="text-[11px] text-white/25 mt-3">
            Inscrições até{' '}
            <span className="text-white/40">{format(new Date(event.registration_deadline), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
          </p>
        )}

        {/* Visibilidade + link de convite (organizer) */}
        {event.is_organizer && (event as any).visibility && (event as any).visibility !== 'PUBLIC' && (
          <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
            <div className="flex items-center gap-2">
              {(event as any).visibility === 'GROUP' ? (
                <><UserCheck className="size-3.5 text-white/40" /><span className="text-xs text-white/40">Visível apenas para membros do grupo</span></>
              ) : (
                <><Link2 className="size-3.5 text-white/40" /><span className="text-xs text-white/40">Visível apenas para convidados</span></>
              )}
            </div>
            {(event as any).visibility === 'INVITE' && (event as any).invite_token && (
              <EventInviteButton eventId={id} inviteToken={(event as any).invite_token} />
            )}
          </div>
        )}
      </div>

      {/* Banner de avaliação pós-evento */}
      {canRate && !userRating && (
        <div className="mx-4 mb-2 rounded-2xl border border-yellow-400/25 bg-yellow-400/8 px-4 py-3 flex items-center gap-3">
          <span className="text-xl">⭐</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-yellow-300 leading-tight">Como foi o evento?</p>
            <p className="text-xs text-white/40 mt-0.5">Avalie sua experiência e ajude outros participantes.</p>
          </div>
        </div>
      )}

      {/* Abas */}
      <div className="px-4 pb-6 space-y-4">
      <Tabs defaultValue={canRate && !userRating ? 'avaliacoes' : 'detalhes'}>
        <TabsList className="w-full bg-white/[0.03] border border-white/[0.07] overflow-x-auto flex-nowrap rounded-2xl p-1 gap-1">
          <TabsTrigger value="detalhes" className="flex-1 rounded-xl text-[11px] font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none text-white/40 hover:text-white/60 transition-colors">Detalhes</TabsTrigger>

          <TabsTrigger value="participantes" className="flex-1 rounded-xl text-[11px] font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none text-white/40 hover:text-white/60 transition-colors">Participantes</TabsTrigger>

          {event.is_organizer && (
            <TabsTrigger value="checkin" className="flex-1 rounded-xl text-[11px] font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none text-white/40 hover:text-white/60 transition-colors flex items-center gap-1">
              <QrCode className="size-3" />Check-in
            </TabsTrigger>
          )}
          {event.is_organizer && eventVisibilityField !== 'PUBLIC' && (
            <TabsTrigger value="solicitacoes" className="flex-1 rounded-xl text-[11px] font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none text-white/40 hover:text-white/60 transition-colors flex items-center gap-1">
              <Users className="size-3" />Solicitações{joinRequests.length > 0 ? ` (${joinRequests.length})` : ''}
            </TabsTrigger>
          )}
          {isFinished && (
            <TabsTrigger value="regras" className="flex-1 rounded-xl text-[11px] font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none text-white/40 hover:text-white/60 transition-colors">Regras</TabsTrigger>
          )}
          {(isConfirmedParticipant || event.is_organizer) && (
            <TabsTrigger value="fotos" className="flex-1 rounded-xl text-[11px] font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none text-white/40 hover:text-white/60 transition-colors flex items-center gap-1">
              <Images className="size-3" />Fotos
            </TabsTrigger>
          )}
          {isFinished && (
            <TabsTrigger value="mural" className="flex-1 rounded-xl text-[11px] font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none text-white/40 hover:text-white/60 transition-colors flex items-center gap-1">
              <MessageSquare className="size-3" />Mural
            </TabsTrigger>
          )}
          {isFinished && (
            <TabsTrigger value="avaliacoes" className="flex-1 rounded-xl text-[11px] font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none text-white/40 hover:text-white/60 transition-colors flex items-center gap-1">
              <Star className="size-3" />Avaliações
            </TabsTrigger>
          )}

          {/* Fila de espera — visível para organizador (quando há fila) ou para quem está na fila */}
          {!isFinished && event.is_organizer && event.waitlist_count > 0 && (
            <TabsTrigger value="fila" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary flex items-center gap-1">
              <ListOrdered className="size-3.5" />Fila ({event.waitlist_count})
            </TabsTrigger>
          )}
          {!isFinished && isOnWaitlist && (
            <TabsTrigger value="fila" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary flex items-center gap-1">
              <ListOrdered className="size-3.5" />Fila
            </TabsTrigger>
          )}

          {/* A realizar: Ingresso (inscrito) → Regras → Mural */}
          {!isFinished && isConfirmedParticipant && (
            <TabsTrigger value="ingresso" className="flex-1 rounded-xl text-[11px] font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none text-white/40 hover:text-white/60 transition-colors flex items-center gap-1">
              <QrCode className="size-3" />Ingresso
            </TabsTrigger>
          )}
          {!isFinished && (
            <TabsTrigger value="regras" className="flex-1 rounded-xl text-[11px] font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none text-white/40 hover:text-white/60 transition-colors">Regras</TabsTrigger>
          )}
          {!isFinished && (
            <TabsTrigger value="mural" className="flex-1 rounded-xl text-[11px] font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none text-white/40 hover:text-white/60 transition-colors flex items-center gap-1">
              <MessageSquare className="size-3" />Mural
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="detalhes" className="space-y-4 pt-3">
          {event.description ? (
            <p className="text-[13px] text-white/60 whitespace-pre-wrap leading-relaxed">{event.description}</p>
          ) : (
            <p className="text-[13px] text-white/25 italic">Sem descrição adicional.</p>
          )}

          {organizer && (
            <div className="text-[11px] text-white/25 border-t border-white/[0.06] pt-3">
              Organizado por{' '}
              <a href={`/u/${organizer.username}`} className="text-primary/80 hover:text-primary transition-colors font-semibold">
                @{organizer.username}
              </a>
            </div>
          )}
        </TabsContent>

        <TabsContent value="participantes" className="pt-3 space-y-3">
          <p className="text-[11px] text-white/30 font-medium">
            {event.confirmed_count} confirmados · {event.waitlist_count} na fila
          </p>
          <Suspense fallback={<ParticipantListSkeleton />}>
            <ParticipantList eventId={id} isOrganizer={event.is_organizer} />
          </Suspense>
        </TabsContent>

        <TabsContent value="mural" className="pt-4">
          {(isConfirmedParticipant || event.is_organizer) ? (
            <EventMural
              eventId={id}
              currentUserId={user.id}
              isOrganizer={event.is_organizer}
              initialComments={initialComments}
              initialPolls={initialPolls}
            />
          ) : (
            <div className="text-center py-10 text-white/30 text-sm">
              Apenas participantes confirmados podem acessar o mural.
            </div>
          )}
        </TabsContent>

        <TabsContent value="regras" className="pt-4">
          <EventRules event={event} />
        </TabsContent>

        {isConfirmedParticipant && (
          <TabsContent value="ingresso" className="pt-4 space-y-4">
            {userTeam && (
              <div className="card-dark rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  <div>
                    <p className="text-xs text-white/40">Seu time</p>
                    <p className="font-semibold text-white">{userTeam.name}</p>
                  </div>
                </div>
                {isOpen && (
                  <ChangeTeamButton
                    participationId={event.user_participation_id!}
                    currentTeamId={userTeam.id}
                    currentTeamName={userTeam.name}
                    teams={teams}
                    changesUsed={(event as any).user_team_changes_used ?? 0}
                  />
                )}
              </div>
            )}
            <ParticipantQRCode
              participationId={event.user_participation_id!}
              eventTitle={event.title}
              checkedInAt={(event as any).user_checked_in_at}
            />
          </TabsContent>
        )}

        {event.is_organizer && (
          <TabsContent value="checkin" className="pt-4 space-y-6">
            <CheckInScanner eventId={id} />
            <CheckInList eventId={id} />
          </TabsContent>
        )}

        {event.is_organizer && eventVisibilityField !== 'PUBLIC' && (
          <TabsContent value="solicitacoes" className="pt-4 space-y-3">
            <p className="text-xs text-white/40">{joinRequests.length} solicitação(ões) pendente(s)</p>
            <EventJoinRequests requests={joinRequests} eventId={id} />
          </TabsContent>
        )}

        {isFinished && (
          <TabsContent value="avaliacoes" className="pt-4">
            <EventRating
              eventId={id}
              average={ratingSummary.average}
              count={ratingSummary.count}
              ratings={ratingSummary.ratings as never}
              userRating={userRating}
              isParticipant={canRate}
            />
          </TabsContent>
        )}
        {(isConfirmedParticipant || event.is_organizer) && (
          <TabsContent value="fotos" className="pt-4">
            <EventGallery
              eventId={id}
              photos={photos as any}
              canUpload={canUploadPhoto}
              currentUserId={user.id}
              isOrganizer={event.is_organizer}
              storageUsage={storageUsage}
            />
          </TabsContent>
        )}

        {/* Fila de espera */}
        {!isFinished && event.is_organizer && (
          <TabsContent value="fila" className="pt-4 space-y-3">
            <p className="text-xs text-white/40">{event.waitlist_count} pessoa{event.waitlist_count !== 1 ? 's' : ''} na fila</p>
            <WaitlistManagement eventId={id} />
          </TabsContent>
        )}
        {!isFinished && isOnWaitlist && waitlistEntry && (
          <TabsContent value="fila" className="pt-4 space-y-4">
            {waitlistEntry.team_id && teams.length > 0 && (() => {
              const waitlistTeam = teams.find((t) => t.id === waitlistEntry!.team_id)
              return waitlistTeam ? (
                <div className="card-dark rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    <div>
                      <p className="text-xs text-white/40">Fila do time</p>
                      <p className="font-semibold text-white">{waitlistTeam.name}</p>
                    </div>
                  </div>
                  <ChangeTeamButton
                    waitlistId={waitlistEntry.id}
                    currentTeamId={waitlistTeam.id}
                    currentTeamName={waitlistTeam.name}
                    teams={teams}
                    isWaitlist
                  />
                </div>
              ) : null
            })()}
            <WaitlistStatus
              entry={waitlistEntry}
              eventId={id}
              eventPrice={event.price}
            />
          </TabsContent>
        )}
      </Tabs>
      </div>
    </main>
  )
}

function ParticipantListSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 card-dark rounded-xl p-3">
          <div className="size-8 rounded-full bg-white/10 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-white/10 rounded w-32" />
            <div className="h-2.5 bg-white/5 rounded w-20" />
          </div>
          <div className="h-5 bg-white/5 rounded-full w-20" />
        </div>
      ))}
    </div>
  )
}
