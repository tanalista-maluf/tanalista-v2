import { Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSession } from '@/ctx'
import { joinEvent } from '@/lib/api'
import { formatEventDate, formatPrice } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { colors, radius } from '@/lib/theme'

type EventDetail = {
  id: string
  title: string
  description: string | null
  address: string
  city: string
  starts_at: string
  registration_deadline: string
  price: number
  capacity: number
  confirmed_count: number
  status: string
  visibility: string
  organizer_id: string
  groups: { name: string } | null
  profiles: { full_name: string } | null
}

async function fetchEvent(eventId: string, userId: string) {
  const [{ data: event }, { data: participation }] = await Promise.all([
    supabase
      .from('events')
      .select(
        'id, title, description, address, city, starts_at, registration_deadline, price, capacity, confirmed_count, status, visibility, organizer_id, groups(name), profiles!events_organizer_id_fkey(full_name)'
      )
      .eq('id', eventId)
      .maybeSingle(),
    supabase
      .from('participations')
      .select('status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  // Uma inscrição cancelada não conta como inscrição: a pessoa pode voltar
  const status = participation?.status === 'CANCELLED' ? null : (participation?.status ?? null)
  return { event: event as EventDetail | null, participationStatus: status }
}

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useSession()
  const userId = session!.user.id

  const [event, setEvent] = useState<EventDetail | null | undefined>(undefined)
  const [participationStatus, setParticipationStatus] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchEvent(id, userId).then((result) => {
      if (!active) return
      setEvent(result.event)
      setParticipationStatus(result.participationStatus)
    })
    return () => {
      active = false
    }
  }, [id, userId])

  async function handleJoin() {
    setJoining(true)
    setMessage(null)
    const joined = await joinEvent(id)
    if ('error' in joined) setMessage(joined.error)

    // Relê o evento: o número de inscritos e a situação da pessoa mudaram
    const result = await fetchEvent(id, userId)
    setEvent(result.event)
    setParticipationStatus(result.participationStatus)
    setJoining(false)
  }

  if (event === undefined) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '' }} />
        <ActivityIndicator style={styles.centered} color={colors.primary} />
      </View>
    )
  }

  if (event === null) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '' }} />
        <Text style={styles.notFound}>Evento não encontrado.</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '' }} />

      <Text style={styles.date}>{formatEventDate(event.starts_at)}</Text>
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.meta}>
        {event.groups?.name ? `${event.groups.name} · ` : ''}
        {event.profiles?.full_name ? `por ${event.profiles.full_name}` : ''}
      </Text>

      <View style={styles.infoCard}>
        <InfoRow label="Local" value={`${event.address} · ${event.city}`} />
        <InfoRow label="Valor" value={formatPrice(event.price)} />
        <InfoRow label="Vagas" value={`${event.confirmed_count}/${event.capacity} inscritos`} />
      </View>

      {event.description ? <Text style={styles.description}>{event.description}</Text> : null}

      <View style={styles.action}>
        <JoinAction
          event={event}
          participationStatus={participationStatus}
          isOrganizer={event.organizer_id === userId}
          joining={joining}
          onJoin={handleJoin}
        />
        {message && <Text style={styles.error}>{message}</Text>}
      </View>
    </ScrollView>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

function JoinAction({
  event,
  participationStatus,
  isOrganizer,
  joining,
  onJoin,
}: {
  event: EventDetail
  participationStatus: string | null
  isOrganizer: boolean
  joining: boolean
  onJoin: () => void
}) {
  if (participationStatus === 'CONFIRMED') {
    return (
      <Text testID="status-confirmed" style={styles.confirmed}>
        ✓ Você está inscrito
      </Text>
    )
  }
  if (participationStatus === 'PENDING') {
    return <Text style={styles.notice}>Sua inscrição aguarda pagamento. Conclua pelo site.</Text>
  }
  if (event.status !== 'OPEN' || new Date(event.registration_deadline) < new Date()) {
    return <Text style={styles.notice}>Inscrições encerradas.</Text>
  }
  if (event.confirmed_count >= event.capacity) {
    return <Text style={styles.notice}>Evento lotado.</Text>
  }
  if (event.visibility === 'PRIVATE' && !isOrganizer) {
    return <Text style={styles.notice}>Evento privado. Peça a entrada ao organizador pelo site.</Text>
  }
  // Pagamento ainda não existe no app: só eventos gratuitos são inscritos por aqui
  if (event.price > 0) {
    return <Text style={styles.notice}>Inscrição paga: por enquanto, conclua pelo site.</Text>
  }

  return (
    <Pressable
      testID="join"
      style={({ pressed }) => [styles.button, (pressed || joining) && styles.buttonPressed]}
      onPress={onJoin}
      disabled={joining}>
      {joining ? (
        <ActivityIndicator color={colors.primaryForeground} />
      ) : (
        <Text style={styles.buttonText}>Inscrever-se</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 10 },
  centered: { flex: 1 },
  notFound: { color: colors.muted, textAlign: 'center', marginTop: 48, fontSize: 15 },
  date: { color: colors.primary, fontSize: 14, fontWeight: '600', textTransform: 'uppercase' },
  title: { color: colors.foreground, fontSize: 26, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 15 },
  infoCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    padding: 16,
    gap: 12,
    marginTop: 10,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  infoLabel: { color: colors.muted, fontSize: 14 },
  infoValue: { color: colors.foreground, fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  description: { color: colors.foreground, fontSize: 15, lineHeight: 22, marginTop: 8 },
  action: { marginTop: 20, gap: 10 },
  confirmed: { color: colors.primary, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  notice: { color: colors.muted, fontSize: 15, textAlign: 'center' },
  error: { color: colors.destructive, fontSize: 14, textAlign: 'center' },
  button: { backgroundColor: colors.primary, borderRadius: radius, paddingVertical: 15, alignItems: 'center' },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: colors.primaryForeground, fontSize: 16, fontWeight: '700' },
})
