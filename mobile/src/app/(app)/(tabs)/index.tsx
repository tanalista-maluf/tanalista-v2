import { router, useFocusEffect } from 'expo-router'
import { CalendarX2 } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { EventCard, type EventCardBadge, type EventCardData } from '@/components/event-card'
import { Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { supabase } from '@/lib/supabase'
import { useTabHeaderInset } from '@/lib/header'
import { colors, fonts, radius } from '@/lib/theme'

type Tab = 'upcoming' | 'mine'
type ListedEvent = EventCardData & { participationStatus?: string }

const EVENT_COLUMNS = 'id, title, starts_at, city, price, capacity, confirmed_count, visibility, groups(name)'

const TABS: { key: Tab; label: string; heading: string; empty: string }[] = [
  { key: 'upcoming', label: 'Próximos', heading: 'Próximos eventos', empty: 'Nenhum evento por vir.' },
  { key: 'mine', label: 'Meus eventos', heading: 'Meus eventos', empty: 'Você ainda não está inscrito em nenhum evento.' },
]

async function fetchUpcomingEvents(): Promise<ListedEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .in('status', ['OPEN', 'PENDING', 'CONFIRMED'])
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(50)

  if (error) throw error
  return data ?? []
}

// Eventos por vir em que a pessoa tem inscrição confirmada ou aguardando pagamento
async function fetchMyEvents(userId: string): Promise<ListedEvent[]> {
  const { data, error } = await supabase
    .from('participations')
    .select(`status, events!inner(${EVENT_COLUMNS}, status)`)
    .eq('user_id', userId)
    .in('status', ['CONFIRMED', 'PENDING'])
    .neq('events.status', 'CANCELLED')
    .gte('events.starts_at', new Date().toISOString())
    .limit(100)

  if (error) throw error
  return (data ?? [])
    .map((row) => ({ ...row.events, participationStatus: row.status }))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
}

function participationBadge(status?: string): EventCardBadge | undefined {
  if (status === 'CONFIRMED') return { label: 'Inscrito', tone: 'primary' }
  if (status === 'PENDING') return { label: 'Pendente', tone: 'warning' }
  return undefined
}

export default function EventsScreen() {
  const { session } = useSession()
  const userId = session!.user.id
  const [tab, setTab] = useState<Tab>('upcoming')
  const [events, setEvents] = useState<Partial<Record<Tab, ListedEvent[]>>>({})
  const [error, setError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const headerInset = useTabHeaderInset()

  const load = useCallback(
    async (which: Tab) => {
      try {
        const data = which === 'mine' ? await fetchMyEvents(userId) : await fetchUpcomingEvents()
        setEvents((current) => ({ ...current, [which]: data }))
        setError(false)
      } catch {
        setError(true)
      }
    },
    [userId]
  )

  // Recarrega também ao voltar da página de um evento: a inscrição pode ter mudado
  useFocusEffect(
    useCallback(() => {
      load(tab)
    }, [load, tab])
  )

  async function handleRefresh() {
    setRefreshing(true)
    await load(tab)
    setRefreshing(false)
  }

  const current = TABS.find((t) => t.key === tab)!
  const listed = events[tab]

  return (
    <Screen>
      <FlatList
        data={listed ?? []}
        keyExtractor={(event) => event.id}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.list, { paddingTop: 16 + headerInset }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            progressViewOffset={headerInset}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.tabs} accessibilityRole="tablist">
              {TABS.map((t) => (
                <Pressable
                  key={t.key}
                  testID={`tab-${t.key}`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: t.key === tab }}
                  onPress={() => setTab(t.key)}
                  style={[styles.tab, t.key === tab && styles.tabActive]}>
                  <Text style={[styles.tabText, t.key === tab && styles.tabTextActive]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.heading}>{current.heading}</Text>
          </View>
        }
        ListEmptyComponent={
          listed === undefined && !error ? (
            <ActivityIndicator style={styles.loading} color={colors.primary} />
          ) : (
            <View style={styles.empty}>
              <CalendarX2 size={36} color={colors.text25} />
              <Text style={styles.emptyText}>
                {error ? 'Não foi possível carregar os eventos. Puxe para tentar de novo.' : current.empty}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <EventCard
            event={item}
            badge={participationBadge(item.participationStatus)}
            onPress={() => router.push({ pathname: '/events/[id]', params: { id: item.id } })}
          />
        )}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  header: { gap: 16, marginBottom: 4 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    padding: 4,
  },
  tab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  tabActive: { backgroundColor: 'rgba(74,222,128,0.12)' },
  tabText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text50 },
  tabTextActive: { fontFamily: fonts.bodyBold, color: colors.primary },
  heading: { fontFamily: fonts.headingBlack, fontSize: 24, color: colors.foreground, letterSpacing: -0.5 },
  loading: { marginTop: 64 },
  empty: { alignItems: 'center', gap: 12, marginTop: 64, paddingHorizontal: 24 },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, textAlign: 'center' },
})
