import * as Calendar from 'expo-calendar'
import { Image } from 'expo-image'
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import {
  Calendar as CalendarIcon,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Flag,
  Lock,
  MapPin,
  Settings2,
  Share2,
  Users,
  X,
} from 'lucide-react-native'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { CancelEventDialog } from '@/components/cancel-event-dialog'
import { headerActions } from '@/components/header-actions'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  MuralSection,
  ParticipantsSection,
  PhotosSection,
  RatingsSection,
  RulesSection,
  TicketSection,
} from '@/components/event-sections'
import { TeamPicker } from '@/components/team-picker'
import { Button, Card, OccupancyBar, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import {
  cancelParticipation,
  changeTeam,
  changeWaitlistTeam,
  confirmWaitlistSpot,
  fetchEventExtras,
  fetchEventTeams,
  fetchOpenPayment,
  joinEvent,
  joinWaitlist,
  leaveWaitlist,
  requestEventJoin,
  runAction,
  type EventExtras,
  type EventTeam,
} from '@/lib/api'
import { countdownParts, formatLongDate, formatPrice } from '@/lib/format'
import { useHeaderInset } from '@/lib/header'
import { shareLink } from '@/lib/share'
import { supabase } from '@/lib/supabase'
import { colors, fonts, radius } from '@/lib/theme'

type EventDetail = {
  id: string
  slug: string | null
  title: string
  description: string | null
  category: string | null
  address: string
  city: string
  starts_at: string
  ends_at: string | null
  registration_deadline: string
  price: number
  capacity: number
  confirmed_count: number
  status: string
  visibility: string
  organizer_id: string
  group_id: string | null
  cancel_before_hours: number | null
  organizer_exempt: boolean
  cover_url: string | null
  min_participants: number
  custom_rules: string | null
  groups: { name: string } | null
  profiles: { full_name: string } | null
}

type Participation = { id: string; status: string; team_id: string | null; team_changes_used: number }

// Lugar da pessoa na fila de espera: aguardando (WAITING) ou com vaga reservada (NOTIFIED)
type WaitlistEntry = {
  id: string
  status: string
  position: number
  expires_at: string | null
  team_id: string | null
}

async function fetchEvent(eventId: string, userId: string) {
  const [{ data: event }, { data: participation }, { data: entry }, teams, extras] = await Promise.all([
    supabase
      .from('events')
      .select(
        'id, slug, title, description, category, address, city, starts_at, ends_at, registration_deadline, price, capacity, confirmed_count, status, visibility, organizer_id, group_id, cancel_before_hours, organizer_exempt, cover_url, min_participants, custom_rules, groups(name), profiles!events_organizer_id_fkey(full_name)'
      )
      .eq('id', eventId)
      .maybeSingle(),
    supabase
      .from('participations')
      .select('id, status, team_id, team_changes_used')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('waitlist_entries')
      .select('id, status, position, expires_at, team_id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .in('status', ['WAITING', 'NOTIFIED'])
      .maybeSingle(),
    fetchEventTeams(eventId),
    fetchEventExtras(eventId),
  ])

  // O dono do grupo edita e cancela os eventos dos gestores
  let isGroupOwner = false
  if (event?.group_id && event.organizer_id !== userId) {
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', event.group_id)
      .eq('user_id', userId)
      .maybeSingle()
    isGroupOwner = membership?.role === 'OWNER'
  }

  // Uma inscrição cancelada não conta como inscrição: a pessoa pode voltar
  const active = participation && participation.status !== 'CANCELLED' ? participation : null
  return {
    event: event as EventDetail | null,
    isGroupOwner,
    participation: active as Participation | null,
    entry: entry as WaitlistEntry | null,
    teams: 'teams' in teams ? teams.teams : [],
    // null quando o servidor não respondeu: as seções extras ficam de fora
    extras: 'error' in extras ? null : extras,
  }
}

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useSession()
  const insets = useSafeAreaInsets()
  const headerInset = useHeaderInset()
  const userId = session!.user.id

  const [event, setEvent] = useState<EventDetail | null | undefined>(undefined)
  const [participation, setParticipation] = useState<Participation | null>(null)
  const [entry, setEntry] = useState<WaitlistEntry | null>(null)
  const [teams, setTeams] = useState<EventTeam[]>([])
  const [extras, setExtras] = useState<EventExtras | null>(null)
  const [section, setSection] = useState<Section>('details')
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  // Trocando de time (inscrito) ou de fila (aguardando)
  const [changingTeam, setChangingTeam] = useState(false)
  const [joining, setJoining] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isGroupOwner, setIsGroupOwner] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  const apply = useCallback((result: Awaited<ReturnType<typeof fetchEvent>>) => {
    setEvent(result.event)
    setIsGroupOwner(result.isGroupOwner)
    setParticipation(result.participation)
    setEntry(result.entry)
    setTeams(result.teams)
    setExtras(result.extras)
  }, [])

  // Relê tudo depois de uma ação: vagas, times e a situação da pessoa mudaram
  async function reload() {
    apply(await fetchEvent(id, userId))
    setSelectedTeam(null)
    setChangingTeam(false)
  }

  // Recarrega também ao voltar da tela de pagamento: a inscrição pode ter sido confirmada
  useFocusEffect(
    useCallback(() => {
      let active = true
      fetchEvent(id, userId).then((result) => {
        if (active) apply(result)
      })
      return () => {
        active = false
      }
    }, [id, userId, apply])
  )

  // Inscrição pendente: volta ao PIX já gerado; sem cobrança em aberto (ex.:
  // cartão recusado), ao checkout, para escolher como pagar
  async function openPayment(participationId: string) {
    setJoining(true)
    setMessage(null)
    const result = await fetchOpenPayment(participationId)
    setJoining(false)

    if ('error' in result) {
      setMessage(result.error)
    } else if (result.open === 'PIX') {
      router.push({ pathname: '/payment/[participationId]', params: { participationId } })
    } else if (result.open === 'CARD_REVIEW') {
      setMessage('Seu pagamento com cartão está em análise. A inscrição é confirmada assim que for aprovado.')
    } else {
      router.push({ pathname: '/checkout/[eventId]', params: { eventId: id } })
    }
  }

  async function handleJoin() {
    if (teams.length > 0 && !selectedTeam) {
      setMessage('Escolha um time para se inscrever.')
      return
    }
    const teamId = selectedTeam ?? undefined

    // Evento pago (para quem não é o organizador isento): cupom e meio de pagamento
    // são escolhidos no checkout. Gratuito confirma direto daqui.
    if (event && event.price > 0 && !(event.organizer_id === userId && event.organizer_exempt)) {
      router.push({ pathname: '/checkout/[eventId]', params: { eventId: id, ...(teamId && { teamId }) } })
      return
    }

    setJoining(true)
    setMessage(null)
    const joined = await joinEvent(id, { teamId })
    if ('error' in joined) setMessage(joined.error)
    await reload()
    setJoining(false)
  }

  async function handleJoinWaitlist() {
    if (teams.length > 0 && !selectedTeam) {
      setMessage('Escolha o time em que você quer a vaga.')
      return
    }
    setJoining(true)
    setMessage(null)
    const joined = await joinWaitlist(id, selectedTeam ?? undefined)
    if ('error' in joined) setMessage(joined.error)
    await reload()
    setJoining(false)
  }

  // Depois de publicar no mural, votar, avaliar ou enviar foto: relê sem mexer no time escolhido
  async function refresh() {
    apply(await fetchEvent(id, userId))
  }

  async function handleRequestJoin() {
    setJoining(true)
    setMessage(null)
    const requested = await requestEventJoin(id)
    if ('error' in requested) setMessage(requested.error)
    await refresh()
    setJoining(false)
  }

  // Abre a tela do sistema de novo evento de calendário, já preenchida
  async function addToCalendar() {
    if (!event) return
    const start = new Date(event.starts_at)
    try {
      await Calendar.createEventInCalendarAsync({
        title: event.title,
        startDate: start,
        // Sem horário de término, 2 horas, como no site
        endDate: event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + 2 * 60 * 60 * 1000),
        location: `${event.address}, ${event.city}`,
        notes: event.description ?? undefined,
      })
    } catch {
      setMessage('Não foi possível abrir o calendário.')
    }
  }

  // Vaga reservada pela fila: evento pago passa pelo checkout, gratuito confirma daqui
  async function handleConfirmSpot() {
    if (event && event.price > 0 && !(event.organizer_id === userId && event.organizer_exempt)) {
      router.push({ pathname: '/checkout/[eventId]', params: { eventId: id, waitlist: '1' } })
      return
    }
    setJoining(true)
    setMessage(null)
    const confirmed = await confirmWaitlistSpot(id)
    if ('error' in confirmed) setMessage(confirmed.error)
    await reload()
    setJoining(false)
  }

  // Dono do grupo, em evento de um gestor: edita ou cancela
  function ownerOptions() {
    Alert.alert('Evento do grupo', 'Como dono do grupo, você pode editar ou cancelar este evento.', [
      { text: 'Editar evento', onPress: () => router.push({ pathname: '/event-form', params: { mode: 'edit', eventId: id } }) },
      { text: 'Cancelar evento', style: 'destructive', onPress: () => setCancelOpen(true) },
      { text: 'Voltar', style: 'cancel' },
    ])
  }

  async function cancelAsOwner() {
    setCancelOpen(false)
    setMessage(null)
    const result = await runAction('cancelEvent', id)
    if ('error' in result) setMessage(result.error)
    await reload()
  }

  function confirmLeaveWaitlist(reserved: boolean) {
    Alert.alert(
      reserved ? 'Recusar a vaga?' : 'Sair da fila?',
      reserved ? 'A vaga passa para a próxima pessoa da fila.' : 'Você perde seu lugar na fila de espera.',
      [
        { text: 'Voltar', style: 'cancel' },
        { text: reserved ? 'Sim, recusar' : 'Sim, sair', style: 'destructive', onPress: handleLeaveWaitlist },
      ]
    )
  }

  async function handleLeaveWaitlist() {
    setCancelling(true)
    setMessage(null)
    const left = await leaveWaitlist(id)
    if ('error' in left) setMessage(left.error)
    await reload()
    setCancelling(false)
  }

  async function handleChangeTeam() {
    if (!selectedTeam) return
    setJoining(true)
    setMessage(null)
    const changed =
      participation?.status === 'CONFIRMED'
        ? await changeTeam(participation.id, selectedTeam)
        : entry
          ? await changeWaitlistTeam(entry.id, selectedTeam)
          : { error: 'Não foi possível trocar de time.' }
    if ('error' in changed) setMessage(changed.error)
    await reload()
    setJoining(false)
  }

  function confirmCancel() {
    if (!event || !participation) return
    const paid = participation.status === 'CONFIRMED' && event.price > 0
    Alert.alert(
      'Cancelar inscrição?',
      'Você perderá sua vaga neste evento.' +
        (paid ? ' O valor que você pagou volta integralmente como crédito na sua carteira TáNaLista.' : ''),
      [
        { text: 'Manter inscrição', style: 'cancel' },
        { text: 'Confirmar cancelamento', style: 'destructive', onPress: () => handleCancel(participation.id) },
      ]
    )
  }

  async function handleCancel(participationId: string) {
    setCancelling(true)
    setMessage(null)
    const cancelled = await cancelParticipation(participationId)
    if ('error' in cancelled) setMessage(cancelled.error)
    await reload()
    setCancelling(false)
  }

  const header = <Stack.Screen options={{ title: '' }} />

  if (event === undefined) {
    return (
      <Screen>
        {header}
        <ActivityIndicator style={styles.centered} color={colors.primary} />
      </Screen>
    )
  }

  if (event === null) {
    return (
      <Screen>
        {header}
        <Text style={styles.notFound}>Evento não encontrado.</Text>
      </Screen>
    )
  }

  const isOrganizer = event.organizer_id === userId
  const action = resolveAction(event, participation?.status ?? null, entry, isOrganizer, extras?.joinRequest ?? null)
  const finished = event.status === 'COMPLETED'
  const sections = availableSections(extras, finished, action.kind === 'confirmed')
  // A seção escolhida pode deixar de existir (ex.: o ingresso, ao cancelar a inscrição)
  const current = sections.some((item) => item.key === section) ? section : 'details'

  // Time em que a pessoa está: o da inscrição confirmada ou o da fila em que aguarda
  const currentTeamId =
    action.kind === 'confirmed' ? participation?.team_id : action.kind === 'waiting' ? entry?.team_id : null
  const currentTeam = teams.find((team) => team.id === currentTeamId) ?? null
  // Inscrito troca de time uma vez; quem aguarda muda de fila quantas vezes quiser
  const canChangeTeam =
    !!currentTeam && teams.length > 1 && (action.kind === 'waiting' || (participation?.team_changes_used ?? 0) < 1)
  const choosingTeam = teams.length > 0 && (action.kind === 'join' || action.kind === 'waitlist')
  const cancellation = participation ? resolveCancellation(event, isOrganizer) : null
  const spotsLeft = Math.max(0, event.capacity - event.confirmed_count)

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: '',
          ...headerActions([
            ...(isOrganizer
              ? [
                  {
                    testID: 'manage',
                    label: 'Gerenciar evento',
                    icon: <Settings2 size={20} color={colors.text70} />,
                    onPress: () => router.push({ pathname: '/manage/[eventId]', params: { eventId: id } }),
                  },
                ]
              : isGroupOwner && !['COMPLETED', 'CANCELLED'].includes(event.status)
                ? [
                    {
                      testID: 'group-owner-options',
                      label: 'Opções do dono do grupo',
                      icon: <Settings2 size={20} color={colors.text70} />,
                      onPress: ownerOptions,
                    },
                  ]
                : []),
            {
              testID: 'share',
              label: 'Compartilhar evento',
              icon: <Share2 size={20} color={colors.text70} />,
              onPress: () => shareLink(event.title, `/e/${event.slug ?? event.id}`),
            },
          ]),
        }}
      />
      {/* O campo do mural fica acima do teclado */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: 16 + headerInset }]}>
          {event.cover_url ? (
            <Image
              testID="event-cover"
              source={event.cover_url}
              style={styles.cover}
              contentFit="cover"
              accessibilityLabel={`Capa do evento ${event.title}`}
            />
          ) : null}
          <View style={styles.hero}>
            {event.category ? (
              <View style={styles.category}>
                <Text style={styles.categoryText}>{event.category}</Text>
              </View>
            ) : null}
            <View style={styles.heroTitleRow}>
              {event.visibility !== 'PUBLIC' && <Lock size={16} color={colors.text40} />}
              <Text style={styles.heroTitle}>{event.title}</Text>
            </View>
            {event.groups?.name ? <Text style={styles.heroGroup}>{event.groups.name}</Text> : null}
            {event.profiles?.full_name ? (
              <Text style={styles.heroOrganizer}>por {event.profiles.full_name}</Text>
            ) : null}
          </View>

          <Countdown startsAt={event.starts_at} />

          <Card style={styles.info}>
            <InfoRow icon={<CalendarIcon size={18} color={colors.primary} />} text={formatLongDate(event.starts_at)} />
            {event.ends_at ? (
              <InfoRow
                icon={<Clock size={18} color={colors.primary} />}
                text={`Término: ${formatLongDate(event.ends_at)}`}
                dim
              />
            ) : null}
            <InfoRow icon={<MapPin size={18} color={colors.primary} />} text={`${event.address} — ${event.city}`} />
            <InfoRow
              icon={<Users size={18} color={colors.primary} />}
              text={`${event.confirmed_count}/${event.capacity} confirmados`}
            />
            <Pressable
              testID="add-to-calendar"
              accessibilityRole="button"
              onPress={addToCalendar}
              hitSlop={6}
              style={styles.calendar}>
              <CalendarPlus size={18} color={colors.primary} />
              <Text style={styles.calendarText}>Adicionar ao calendário</Text>
            </Pressable>
            <View style={styles.occupancy}>
              <OccupancyBar confirmed={event.confirmed_count} capacity={event.capacity} />
              <Text style={styles.spots}>
                {spotsLeft === 0 ? 'Sem vagas' : spotsLeft === 1 ? '1 vaga disponível' : `${spotsLeft} vagas disponíveis`}
              </Text>
            </View>
          </Card>

          {sections.length > 1 && (
            <View style={styles.sections} accessibilityRole="tablist">
            {sections.map((item) => {
                const selected = item.key === current
                return (
                  <Pressable
                    key={item.key}
                    testID={`section-${item.key}`}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => setSection(item.key)}
                    style={[styles.sectionChip, selected && styles.sectionChipSelected]}>
                    <Text style={[styles.sectionChipText, selected && styles.sectionChipTextSelected]}>{item.label}</Text>
                  </Pressable>
                )
              })}
            </View>
          )}

          {extras && current === 'participants' && <ParticipantsSection extras={extras} teams={teams} />}
          {extras && current === 'mural' && <MuralSection eventId={id} extras={extras} onChanged={refresh} />}
          {current === 'rules' && <RulesSection event={event} />}
          {extras && current === 'ticket' && participation && (
            <TicketSection participationId={participation.id} eventTitle={event.title} checkedInAt={extras.checkedInAt} />
          )}
          {extras && current === 'photos' && <PhotosSection eventId={id} extras={extras} onChanged={refresh} />}
          {extras && current === 'ratings' && (
            <RatingsSection
              eventId={id}
              extras={extras}
              canRate={finished && participation?.status === 'CONFIRMED'}
              onChanged={refresh}
            />
          )}

          {current === 'details' && (
            <>
              {event.description ? (
                <Card style={styles.about}>
                  <Text style={styles.sectionLabel}>Sobre o evento</Text>
                  <Text style={styles.description}>{event.description}</Text>
                </Card>
              ) : null}

              {choosingTeam && (
                <View style={styles.teams}>
                  <Text style={styles.sectionLabel}>
                    {action.kind === 'waitlist' ? 'Fila de qual time?' : 'Escolha seu time'}
                  </Text>
                  <TeamPicker
                    teams={teams}
                    selectedId={selectedTeam}
                    onSelect={setSelectedTeam}
                    allowFull={action.kind === 'waitlist'}
                    disabled={joining}
                  />
                </View>
              )}

              {currentTeam && (
                <Card style={styles.team}>
                  <View style={styles.teamRow}>
                    <View style={styles.teamBody}>
                      <Text style={styles.sectionLabel}>{action.kind === 'waiting' ? 'Fila do time' : 'Seu time'}</Text>
                      <Text testID="current-team" style={styles.teamName}>
                        {currentTeam.name}
                      </Text>
                    </View>
                    {canChangeTeam && !changingTeam && (
                      <Pressable
                        testID="change-team"
                        accessibilityRole="button"
                        onPress={() => setChangingTeam(true)}
                        hitSlop={10}>
                        <Text style={styles.teamLink}>{action.kind === 'waiting' ? 'Mudar fila' : 'Trocar time'}</Text>
                      </Pressable>
                    )}
                    {!canChangeTeam && action.kind === 'confirmed' && teams.length > 1 && (
                      <Text style={styles.teamUsed}>Troca usada</Text>
                    )}
                  </View>
                  {changingTeam && (
                    <>
                      {action.kind === 'confirmed' && (
                        <Text style={styles.teamHint}>Você pode trocar de time uma única vez.</Text>
                      )}
                      <TeamPicker
                        teams={teams.filter((team) => team.id !== currentTeam.id)}
                        selectedId={selectedTeam}
                        onSelect={setSelectedTeam}
                        allowFull={action.kind === 'waiting'}
                        disabled={joining}
                      />
                      <Button
                        testID="change-team-confirm"
                        label="Confirmar troca"
                        onPress={handleChangeTeam}
                        loading={joining}
                        disabled={!selectedTeam}
                      />
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          setChangingTeam(false)
                          setSelectedTeam(null)
                        }}
                        hitSlop={8}
                        style={styles.teamCancel}>
                        <Text style={styles.teamCancelText}>Deixar como está</Text>
                      </Pressable>
                    </>
                  )}
                </Card>
              )}

              {action.kind === 'notice' && (
                <Text testID="notice" style={styles.notice}>
                  {action.text}
                </Text>
              )}
              {action.kind === 'waitlist' && (
                <Text testID="notice" style={styles.notice}>
                  Evento lotado. Entre na fila de espera: avisamos você se abrir uma vaga.
                </Text>
              )}
              {action.kind === 'waiting' && (
                <Text testID="notice" style={styles.notice}>
                  Você está na fila de espera, na posição #{action.position}. Avisamos você se abrir uma vaga.
                </Text>
              )}
              {action.kind === 'spot' && (
                <Text testID="notice" style={styles.spot}>
                  Abriu uma vaga para você!
                  {action.expiresAt ? ` Confirme até ${formatLongDate(action.expiresAt)}.` : ' Confirme sua inscrição.'}
                </Text>
              )}
              {(action.kind === 'waiting' || action.kind === 'spot') && (
                <Pressable
                  testID="leave-waitlist"
                  accessibilityRole="button"
                  onPress={() => confirmLeaveWaitlist(action.kind === 'spot')}
                  disabled={cancelling}
                  hitSlop={8}
                  style={styles.cancel}>
                  {cancelling ? (
                    <ActivityIndicator color={colors.destructive} />
                  ) : (
                    <Text style={styles.cancelText}>{action.kind === 'spot' ? 'Recusar vaga' : 'Sair da fila'}</Text>
                  )}
                </Pressable>
              )}
              {cancellation?.allowed && (
                <Pressable
                  testID="cancel"
                  accessibilityRole="button"
                  onPress={confirmCancel}
                  disabled={cancelling}
                  hitSlop={8}
                  style={styles.cancel}>
                  {cancelling ? (
                    <ActivityIndicator color={colors.destructive} />
                  ) : (
                    <>
                      <X size={15} color={colors.destructive} />
                      <Text style={styles.cancelText}>Cancelar inscrição</Text>
                    </>
                  )}
                </Pressable>
              )}
              {cancellation && !cancellation.allowed && (
                <Text testID="cancel-unavailable" style={styles.notice}>
                  {cancellation.reason}
                </Text>
              )}
              {action.kind === 'pay' && (
                <Text testID="notice" style={styles.notice}>
                  Sua inscrição aguarda o pagamento.
                </Text>
              )}
              {action.kind === 'request' && (
                <Text testID="notice" style={styles.notice}>
                  {action.status === 'PENDING'
                    ? 'Seu pedido de entrada foi enviado. O organizador ainda não respondeu.'
                    : action.status === 'REJECTED'
                      ? 'O organizador recusou seu pedido de entrada. Você pode pedir de novo.'
                      : 'Evento privado: peça a entrada ao organizador.'}
                </Text>
              )}
              <Pressable
                testID="report"
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/report', params: { type: 'EVENT', id, name: event.title } })}
                hitSlop={8}
                style={styles.report}>
                <Flag size={14} color={colors.text35} />
                <Text style={styles.reportText}>Denunciar evento</Text>
              </Pressable>
            </>
          )}
          {message && <Text style={styles.error}>{message}</Text>}
        </ScrollView>

        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.barPrice}>
            <Text style={styles.price}>{formatPrice(event.price)}</Text>
            <Text style={styles.priceCaption}>{event.price === 0 ? 'Sem custo' : 'por pessoa'}</Text>
          </View>
          {action.kind === 'join' && (
            <Button testID="join" label="Inscrever-se" onPress={handleJoin} loading={joining} style={styles.barButton} />
          )}
          {action.kind === 'waitlist' && (
            <Button
              testID="join-waitlist"
              label="Entrar na fila"
              onPress={handleJoinWaitlist}
              loading={joining}
              style={styles.barButton}
            />
          )}
          {action.kind === 'spot' && (
            <Button
              testID="confirm-spot"
              label="Confirmar vaga"
              onPress={handleConfirmSpot}
              loading={joining}
              style={styles.barButton}
            />
          )}
          {action.kind === 'waiting' && (
            <View testID="status-waiting" style={styles.unavailable}>
              <Text style={styles.unavailableText}>Na fila</Text>
            </View>
          )}
          {action.kind === 'request' && action.status !== 'PENDING' && (
            <Button
              testID="request-join"
              label="Pedir entrada"
              onPress={handleRequestJoin}
              loading={joining}
              style={styles.barButton}
            />
          )}
          {action.kind === 'request' && action.status === 'PENDING' && (
            <View testID="status-requested" style={styles.unavailable}>
              <Text style={styles.unavailableText}>Pedido enviado</Text>
            </View>
          )}
          {action.kind === 'pay' && participation && (
            <Button
              testID="pay"
              label="Pagar"
              onPress={() => openPayment(participation.id)}
              loading={joining}
              style={styles.barButton}
            />
          )}
          {action.kind === 'confirmed' && (
            <View testID="status-confirmed" style={styles.confirmed} accessible accessibilityLabel="Você está inscrito">
              <CheckCircle2 size={18} color={colors.primary} />
              <Text style={styles.confirmedText}>Inscrito</Text>
            </View>
          )}
          {action.kind === 'notice' && (
            <View style={styles.unavailable}>
              <Text style={styles.unavailableText}>{action.label}</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
      {isGroupOwner && (
        <CancelEventDialog
          visible={cancelOpen}
          title={event.title}
          confirmedCount={event.confirmed_count}
          refundLabel={null}
          onClose={() => setCancelOpen(false)}
          onConfirm={cancelAsOwner}
        />
      )}
    </Screen>
  )
}

type Action =
  | { kind: 'join' }
  | { kind: 'pay' }
  | { kind: 'confirmed' }
  // Fila de espera: dá para entrar, a pessoa aguarda, ou a fila reservou uma vaga para ela
  | { kind: 'waitlist' }
  | { kind: 'waiting'; position: number }
  | { kind: 'spot'; expiresAt: string | null }
  // Evento privado: a pessoa pede a entrada e espera o organizador
  | { kind: 'request'; status: 'PENDING' | 'REJECTED' | null }
  // label vai no botão desativado da barra; text explica o motivo acima dela
  | { kind: 'notice'; label: string; text: string }

function resolveAction(
  event: EventDetail,
  participationStatus: string | null,
  entry: WaitlistEntry | null,
  isOrganizer: boolean,
  joinRequest: EventExtras['joinRequest']
): Action {
  if (participationStatus === 'CONFIRMED') return { kind: 'confirmed' }
  if (participationStatus === 'PENDING') return { kind: 'pay' }
  if (event.status !== 'OPEN' || new Date(event.registration_deadline) < new Date()) {
    return { kind: 'notice', label: 'Encerrado', text: 'Inscrições encerradas.' }
  }
  if (entry?.status === 'NOTIFIED') return { kind: 'spot', expiresAt: entry.expires_at }
  if (entry) return { kind: 'waiting', position: entry.position }
  // Pedido aprovado libera a inscrição, como no servidor (canJoinPrivateEvent)
  if (event.visibility === 'PRIVATE' && !isOrganizer && joinRequest !== 'APPROVED') {
    return { kind: 'request', status: joinRequest }
  }
  if (event.confirmed_count >= event.capacity) return { kind: 'waitlist' }
  return { kind: 'join' }
}

type Section = 'details' | 'participants' | 'mural' | 'rules' | 'ticket' | 'photos' | 'ratings'

// Seções da página, como as abas do site. Sem os extras (servidor fora do ar),
// ficam só os detalhes e as regras, que vêm do próprio evento.
function availableSections(extras: EventExtras | null, finished: boolean, confirmed: boolean) {
  const sections: { key: Section; label: string }[] = [{ key: 'details', label: 'Detalhes' }]
  if (extras) sections.push({ key: 'participants', label: `Participantes (${extras.participants.length})` })
  if (extras && confirmed && !finished) sections.push({ key: 'ticket', label: 'Ingresso' })
  if (extras) sections.push({ key: 'mural', label: 'Mural' })
  sections.push({ key: 'rules', label: 'Regras' })
  if (extras?.isMember) sections.push({ key: 'photos', label: 'Fotos' })
  if (extras && finished) sections.push({ key: 'ratings', label: 'Avaliações' })
  return sections
}

// Mesma política que o servidor aplica (cancel-participation.ts no site); aqui
// só decide o que mostrar. null em cancel_before_hours = organizador não permite.
function resolveCancellation(
  event: EventDetail,
  isOrganizer: boolean
): { allowed: true } | { allowed: false; reason: string } {
  if (['CANCELLED', 'COMPLETED'].includes(event.status)) {
    return { allowed: false, reason: 'Este evento não permite mais cancelamento.' }
  }
  if (isOrganizer) return { allowed: true }
  if (event.cancel_before_hours === null) {
    return { allowed: false, reason: 'Este evento não permite cancelamento pelo participante.' }
  }
  const hoursLeft = (new Date(event.starts_at).getTime() - Date.now()) / 3600000
  if (event.cancel_before_hours > 0 && hoursLeft < event.cancel_before_hours) {
    return {
      allowed: false,
      reason: `Cancelamentos devem ser feitos com pelo menos ${event.cancel_before_hours}h de antecedência.`,
    }
  }
  return { allowed: true }
}

function InfoRow({ icon, text, dim }: { icon: ReactNode; text: string; dim?: boolean }) {
  return (
    <View style={styles.infoRow}>
      {icon}
      <Text style={[styles.infoText, dim && styles.infoTextDim]}>{text}</Text>
    </View>
  )
}

function Countdown({ startsAt }: { startsAt: string }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  const parts = countdownParts(startsAt, now)
  if (!parts) return null

  return (
    <Card style={styles.countdown}>
      <Text style={styles.sectionLabel}>Começa em</Text>
      <View style={styles.countdownRow}>
        <CountdownUnit value={parts.days} label="Dias" />
        <Text style={styles.countdownSep}>:</Text>
        <CountdownUnit value={parts.hours} label="Horas" />
        <Text style={styles.countdownSep}>:</Text>
        <CountdownUnit value={parts.minutes} label="Min" />
      </View>
    </Card>
  )
}

function CountdownUnit({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.countdownUnit}>
      <Text style={styles.countdownValue}>{value}</Text>
      <Text style={styles.countdownLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1 },
  notFound: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center', marginTop: 140, fontSize: 15 },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  cover: { height: 180, borderRadius: 24, backgroundColor: colors.input },
  calendar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  calendarText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.primary },
  // As seções quebram linha em vez de rolar para o lado: todas ficam à vista
  sections: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectionChip: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  sectionChipSelected: { borderColor: 'rgba(74,222,128,0.45)', backgroundColor: 'rgba(74,222,128,0.1)' },
  sectionChipText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text70 },
  sectionChipTextSelected: { fontFamily: fonts.bodyBold, color: colors.primary },
  report: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40, marginTop: 8 },
  reportText: { fontFamily: fonts.body, fontSize: 13, color: colors.text35 },
  hero: {
    backgroundColor: colors.hero,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  category: {
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.25)',
    backgroundColor: 'rgba(74,222,128,0.08)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 4,
  },
  categoryText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.primary },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroTitle: {
    flexShrink: 1,
    fontFamily: fonts.headingBlack,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: colors.text,
    textAlign: 'center',
  },
  heroGroup: { fontFamily: fonts.body, fontSize: 15, color: colors.text50 },
  heroOrganizer: { fontFamily: fonts.body, fontSize: 13, color: colors.text35 },
  countdown: { paddingVertical: 18, alignItems: 'center', gap: 10 },
  countdownRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  countdownUnit: { alignItems: 'center', minWidth: 56 },
  countdownValue: { fontFamily: fonts.headingBlack, fontSize: 34, lineHeight: 38, color: colors.primary },
  countdownLabel: { fontFamily: fonts.bodyMedium, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.text35 },
  countdownSep: { fontFamily: fonts.headingBlack, fontSize: 26, lineHeight: 36, color: colors.text25 },
  sectionLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.text40 },
  info: { padding: 18, gap: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoText: { flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.foreground },
  infoTextDim: { color: colors.text70 },
  occupancy: { gap: 8, marginTop: 2 },
  spots: { fontFamily: fonts.body, fontSize: 12, color: colors.text35 },
  about: { padding: 18, gap: 10 },
  description: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.foreground },
  teams: { gap: 10, marginTop: 4 },
  team: { padding: 18, gap: 14 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  teamBody: { flex: 1, gap: 4 },
  teamName: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.text },
  teamLink: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },
  teamUsed: { fontFamily: fonts.body, fontSize: 12, color: colors.text35 },
  teamHint: { fontFamily: fonts.body, fontSize: 13, color: colors.text50 },
  teamCancel: { alignItems: 'center', justifyContent: 'center', minHeight: 36 },
  teamCancelText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text50 },
  spot: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 21, color: colors.primary, textAlign: 'center', marginTop: 4 },
  notice: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center', marginTop: 4 },
  cancel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, marginTop: 4 },
  cancelText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.destructive },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.destructive, textAlign: 'center' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  barPrice: { flex: 1 },
  price: { fontFamily: fonts.headingBlack, fontSize: 20, color: colors.primary },
  priceCaption: { fontFamily: fonts.body, fontSize: 12, color: colors.text35, marginTop: 2 },
  barButton: { minWidth: 160 },
  confirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.25)',
    backgroundColor: 'rgba(74,222,128,0.08)',
    borderRadius: radius.pill,
    minHeight: 48,
    paddingHorizontal: 22,
  },
  confirmedText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primary },
  unavailable: {
    minWidth: 140,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 22,
  },
  unavailableText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text35 },
})
