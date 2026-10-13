import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Calendar, CheckCircle2, Clock, Lock, MapPin, Users, X } from 'lucide-react-native'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Card, OccupancyBar, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { cancelParticipation, joinEvent } from '@/lib/api'
import { countdownParts, formatLongDate, formatPrice } from '@/lib/format'
import { useHeaderInset } from '@/lib/header'
import { supabase } from '@/lib/supabase'
import { colors, fonts, radius } from '@/lib/theme'

type EventDetail = {
  id: string
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
  cancel_before_hours: number | null
  organizer_exempt: boolean
  groups: { name: string } | null
  profiles: { full_name: string } | null
}

async function fetchEvent(eventId: string, userId: string) {
  const [{ data: event }, { data: participation }] = await Promise.all([
    supabase
      .from('events')
      .select(
        'id, title, description, category, address, city, starts_at, ends_at, registration_deadline, price, capacity, confirmed_count, status, visibility, organizer_id, cancel_before_hours, organizer_exempt, groups(name), profiles!events_organizer_id_fkey(full_name)'
      )
      .eq('id', eventId)
      .maybeSingle(),
    supabase
      .from('participations')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  // Uma inscrição cancelada não conta como inscrição: a pessoa pode voltar
  const active = participation && participation.status !== 'CANCELLED' ? participation : null
  return { event: event as EventDetail | null, participation: active }
}

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useSession()
  const insets = useSafeAreaInsets()
  const headerInset = useHeaderInset()
  const userId = session!.user.id

  const [event, setEvent] = useState<EventDetail | null | undefined>(undefined)
  const [participation, setParticipation] = useState<{ id: string; status: string } | null>(null)
  const [joining, setJoining] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Recarrega também ao voltar da tela de pagamento: a inscrição pode ter sido confirmada
  useFocusEffect(
    useCallback(() => {
      let active = true
      fetchEvent(id, userId).then((result) => {
        if (!active) return
        setEvent(result.event)
        setParticipation(result.participation)
      })
      return () => {
        active = false
      }
    }, [id, userId])
  )

  function openPayment(participationId: string) {
    router.push({ pathname: '/payment/[participationId]', params: { participationId } })
  }

  async function handleJoin() {
    // Evento pago (para quem não é o organizador isento): cupom e meio de pagamento
    // são escolhidos no checkout. Gratuito confirma direto daqui.
    if (event && event.price > 0 && !(event.organizer_id === userId && event.organizer_exempt)) {
      router.push({ pathname: '/checkout/[eventId]', params: { eventId: id } })
      return
    }

    setJoining(true)
    setMessage(null)
    const joined = await joinEvent(id)
    if ('error' in joined) setMessage(joined.error)

    // Relê o evento: o número de inscritos e a situação da pessoa mudaram
    const result = await fetchEvent(id, userId)
    setEvent(result.event)
    setParticipation(result.participation)
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

    const result = await fetchEvent(id, userId)
    setEvent(result.event)
    setParticipation(result.participation)
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
  const action = resolveAction(event, participation?.status ?? null, isOrganizer)
  const cancellation = participation ? resolveCancellation(event, isOrganizer) : null
  const spotsLeft = Math.max(0, event.capacity - event.confirmed_count)

  return (
    <Screen>
      {header}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingTop: 16 + headerInset }]}>
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
          <InfoRow icon={<Calendar size={18} color={colors.primary} />} text={formatLongDate(event.starts_at)} />
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
          <View style={styles.occupancy}>
            <OccupancyBar confirmed={event.confirmed_count} capacity={event.capacity} />
            <Text style={styles.spots}>
              {spotsLeft === 0 ? 'Sem vagas' : spotsLeft === 1 ? '1 vaga disponível' : `${spotsLeft} vagas disponíveis`}
            </Text>
          </View>
        </Card>

        {event.description ? (
          <Card style={styles.about}>
            <Text style={styles.sectionLabel}>Sobre o evento</Text>
            <Text style={styles.description}>{event.description}</Text>
          </Card>
        ) : null}

        {action.kind === 'notice' && (
          <Text testID="notice" style={styles.notice}>
            {action.text}
          </Text>
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
            Sua inscrição aguarda o pagamento por PIX.
          </Text>
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
        {action.kind === 'pay' && participation && (
          <Button testID="pay" label="Pagar" onPress={() => openPayment(participation.id)} style={styles.barButton} />
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
    </Screen>
  )
}

type Action =
  | { kind: 'join' }
  | { kind: 'pay' }
  | { kind: 'confirmed' }
  // label vai no botão desativado da barra; text explica o motivo acima dela
  | { kind: 'notice'; label: string; text: string }

function resolveAction(event: EventDetail, participationStatus: string | null, isOrganizer: boolean): Action {
  if (participationStatus === 'CONFIRMED') return { kind: 'confirmed' }
  if (participationStatus === 'PENDING') return { kind: 'pay' }
  if (event.status !== 'OPEN' || new Date(event.registration_deadline) < new Date()) {
    return { kind: 'notice', label: 'Encerrado', text: 'Inscrições encerradas.' }
  }
  if (event.confirmed_count >= event.capacity) {
    return { kind: 'notice', label: 'Esgotado', text: 'Evento lotado.' }
  }
  if (event.visibility === 'PRIVATE' && !isOrganizer) {
    return { kind: 'notice', label: 'Privado', text: 'Evento privado. Peça a entrada ao organizador pelo site.' }
  }
  return { kind: 'join' }
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
  centered: { flex: 1 },
  notFound: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center', marginTop: 140, fontSize: 15 },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
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
