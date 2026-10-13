import { router, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useSession } from '@/ctx'
import { formatEventDate, formatPrice } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { colors, radius } from '@/lib/theme'

type EventItem = {
  id: string
  title: string
  starts_at: string
  city: string
  price: number
  capacity: number
  confirmed_count: number
  visibility: string
  groups: { name: string } | null
}

async function fetchUpcomingEvents(): Promise<EventItem[]> {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, starts_at, city, price, capacity, confirmed_count, visibility, groups(name)')
    .in('status', ['OPEN', 'PENDING', 'CONFIRMED'])
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(50)

  if (error) throw error
  return data ?? []
}

export default function EventsScreen() {
  const { signOut } = useSession()
  const [events, setEvents] = useState<EventItem[] | null>(null)
  const [error, setError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    let active = true
    fetchUpcomingEvents()
      .then((data) => active && setEvents(data))
      .catch(() => active && setError(true))
    return () => {
      active = false
    }
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      setEvents(await fetchUpcomingEvents())
      setError(false)
    } catch {
      setError(true)
    }
    setRefreshing(false)
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Eventos',
          headerRight: () => (
            <Pressable testID="sign-out" onPress={signOut} hitSlop={12}>
              <Text style={styles.signOut}>Sair</Text>
            </Pressable>
          ),
        }}
      />

      {events === null && !error ? (
        <ActivityIndicator style={styles.centered} color={colors.primary} />
      ) : (
        <FlatList
          data={events ?? []}
          keyExtractor={(event) => event.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {error ? 'Não foi possível carregar os eventos. Puxe para tentar de novo.' : 'Nenhum evento por vir.'}
            </Text>
          }
          renderItem={({ item }) => <EventCard event={item} />}
        />
      )}
    </View>
  )
}

function EventCard({ event }: { event: EventItem }) {
  const spotsLeft = event.capacity - event.confirmed_count
  const spots = spotsLeft <= 0 ? 'Lotado' : `${event.confirmed_count}/${event.capacity} inscritos`

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}. ${formatEventDate(event.starts_at)}. ${formatPrice(event.price)}. ${spots}`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}>
        <Text style={styles.date}>{formatEventDate(event.starts_at)}</Text>
        <Text style={styles.title}>
          {event.visibility === 'PRIVATE' ? '🔒 ' : ''}
          {event.title}
        </Text>
        <Text style={styles.meta}>
          {event.groups?.name ? `${event.groups.name} · ` : ''}
          {event.city}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.price}>{formatPrice(event.price)}</Text>
          <Text style={[styles.spots, spotsLeft <= 0 && styles.spotsFull]}>{spots}</Text>
        </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1 },
  list: { padding: 16, gap: 12 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 48, fontSize: 15 },
  signOut: { color: colors.muted, fontSize: 15 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    padding: 16,
    gap: 6,
  },
  cardPressed: { opacity: 0.7 },
  date: { color: colors.primary, fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  title: { color: colors.foreground, fontSize: 18, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 14 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  price: { color: colors.foreground, fontSize: 15, fontWeight: '600' },
  spots: { color: colors.muted, fontSize: 14 },
  spotsFull: { color: colors.warning },
})
