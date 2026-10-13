import { router, Stack } from 'expo-router'
import { CalendarX2 } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { EventCard, type EventCardData } from '@/components/event-card'
import { Logo } from '@/components/logo'
import { Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { supabase } from '@/lib/supabase'
import { colors, fonts } from '@/lib/theme'

async function fetchUpcomingEvents(): Promise<EventCardData[]> {
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
  const [events, setEvents] = useState<EventCardData[] | null>(null)
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
    <Screen>
      <Stack.Screen
        options={{
          title: '',
          headerLeft: () => <Logo size={19} />,
          headerRight: () => (
            <Pressable testID="sign-out" onPress={signOut} hitSlop={12} accessibilityRole="button">
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
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          ListHeaderComponent={<Text style={styles.heading}>Próximos eventos</Text>}
          ListEmptyComponent={
            <View style={styles.empty}>
              <CalendarX2 size={36} color={colors.text25} />
              <Text style={styles.emptyText}>
                {error ? 'Não foi possível carregar os eventos. Puxe para tentar de novo.' : 'Nenhum evento por vir.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onPress={() => router.push({ pathname: '/events/[id]', params: { id: item.id } })}
            />
          )}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  centered: { flex: 1 },
  list: { padding: 16, gap: 12 },
  heading: { fontFamily: fonts.headingBlack, fontSize: 24, color: colors.foreground, letterSpacing: -0.5, marginBottom: 4 },
  signOut: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text50 },
  empty: { alignItems: 'center', gap: 12, marginTop: 64, paddingHorizontal: 24 },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, textAlign: 'center' },
})
