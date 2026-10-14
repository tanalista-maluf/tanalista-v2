import { router, useFocusEffect } from 'expo-router'
import { CalendarX2, Search } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
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

// Mesmas categorias do site (src/app/(app)/eventos/page.tsx)
const CATEGORIES = [
  'Futebol',
  'Basquete',
  'Vôlei',
  'Airsoft & Paintball',
  'Corrida & Trilha',
  'Gastronomia',
  'Negócios',
  'Ensino',
  'Música',
  'Social',
  'Outros',
]

type Filter = { search: string; category: string | null }

async function fetchUpcomingEvents(filter: Filter): Promise<ListedEvent[]> {
  let query = supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .in('status', ['OPEN', 'PENDING', 'CONFIRMED'])
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(50)

  // % e _ são curingas do ilike, e vírgula e parênteses separam filtros
  const term = filter.search.trim().replace(/[%_,()]/g, ' ')
  if (term) query = query.ilike('title', `%${term}%`)
  if (filter.category) query = query.eq('category', filter.category)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

// Eventos por vir em que a pessoa tem inscrição confirmada ou aguardando
// pagamento e, depois deles, os últimos concluídos de que participou (é por
// aqui que se chega às fotos e à avaliação de um evento que já aconteceu)
async function fetchMyEvents(userId: string): Promise<ListedEvent[]> {
  const now = new Date().toISOString()
  const [upcoming, past] = await Promise.all([
    supabase
      .from('participations')
      .select(`status, events!inner(${EVENT_COLUMNS}, status)`)
      .eq('user_id', userId)
      .in('status', ['CONFIRMED', 'PENDING'])
      .neq('events.status', 'CANCELLED')
      .gte('events.starts_at', now)
      .limit(100),
    supabase
      .from('participations')
      .select(`status, events!inner(${EVENT_COLUMNS}, status)`)
      .eq('user_id', userId)
      .eq('status', 'CONFIRMED')
      .eq('events.status', 'COMPLETED')
      .limit(100),
  ])

  if (upcoming.error) throw upcoming.error
  const next = (upcoming.data ?? [])
    .map((row) => ({ ...row.events, participationStatus: row.status }))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const done = (past.data ?? [])
    .map((row) => ({ ...row.events, participationStatus: 'COMPLETED' }))
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
    .slice(0, 10)
  return [...next, ...done]
}

function participationBadge(status?: string): EventCardBadge | undefined {
  if (status === 'CONFIRMED') return { label: 'Inscrito', tone: 'primary' }
  if (status === 'PENDING') return { label: 'Pendente', tone: 'warning' }
  if (status === 'COMPLETED') return { label: 'Concluído', tone: 'muted' }
  return undefined
}

export default function EventsScreen() {
  const { session } = useSession()
  const userId = session!.user.id
  const [tab, setTab] = useState<Tab>('upcoming')
  const [events, setEvents] = useState<Partial<Record<Tab, ListedEvent[]>>>({})
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const headerInset = useTabHeaderInset()

  const load = useCallback(
    async (which: Tab, filter: Filter) => {
      try {
        const data = which === 'mine' ? await fetchMyEvents(userId) : await fetchUpcomingEvents(filter)
        setEvents((current) => ({ ...current, [which]: data }))
        setError(false)
      } catch {
        setError(true)
      }
    },
    [userId]
  )

  // Recarrega também ao voltar da página de um evento: a inscrição pode ter mudado.
  // A categoria vale ao tocar; a busca, só ao enviar o campo, não a cada letra.
  useFocusEffect(
    useCallback(() => {
      load(tab, { search, category })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, tab, category])
  )

  async function handleRefresh() {
    setRefreshing(true)
    await load(tab, { search, category })
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
        keyboardShouldPersistTaps="handled"
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
            {tab === 'upcoming' && (
              <>
                <View style={styles.search}>
                  <Search size={16} color={colors.text35} />
                  <TextInput
                    testID="events-search"
                    value={search}
                    onChangeText={setSearch}
                    onSubmitEditing={() => load('upcoming', { search, category })}
                    placeholder="Buscar evento pelo nome"
                    placeholderTextColor={colors.text35}
                    selectionColor={colors.primary}
                    autoCorrect={false}
                    returnKeyType="search"
                    style={styles.searchInput}
                  />
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  style={styles.categories}
                  contentContainerStyle={styles.categoriesContent}>
                  {CATEGORIES.map((item, index) => {
                    const selected = item === category
                    return (
                      <Pressable
                        key={item}
                        testID={`category-${index}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setCategory(selected ? null : item)}
                        style={[styles.chip, selected && styles.chipSelected]}>
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item}</Text>
                      </Pressable>
                    )
                  })}
                </ScrollView>
              </>
            )}
            <Text style={styles.heading}>{current.heading}</Text>
          </View>
        }
        ListEmptyComponent={
          listed === undefined && !error ? (
            <ActivityIndicator style={styles.loading} color={colors.primary} />
          ) : (
            <View style={styles.empty}>
              <CalendarX2 size={36} color={colors.text25} />
              <Text testID="events-empty" style={styles.emptyText}>
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
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 18,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  searchInput: { flex: 1, height: 48, fontFamily: fonts.body, fontSize: 15, color: colors.foreground },
  // A faixa de categorias vai até as bordas da tela, por cima do recuo da lista
  categories: { marginHorizontal: -16, flexGrow: 0 },
  categoriesContent: { gap: 8, paddingHorizontal: 16 },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  chipSelected: { borderColor: 'rgba(74,222,128,0.45)', backgroundColor: 'rgba(74,222,128,0.1)' },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text70 },
  chipTextSelected: { color: colors.primary },
  heading: { fontFamily: fonts.headingBlack, fontSize: 24, color: colors.foreground, letterSpacing: -0.5 },
  loading: { marginTop: 64 },
  empty: { alignItems: 'center', gap: 12, marginTop: 64, paddingHorizontal: 24 },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, textAlign: 'center' },
})
