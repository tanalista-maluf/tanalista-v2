import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { CalendarX2, FilePen, Plus, Repeat, Search, Trash2 } from 'lucide-react-native'
import { DateTimePicker } from '@expo/ui/community/datetime-picker'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Dropdown } from '@/components/dropdown'
import { EventCard, type EventCardBadge, type EventCardData } from '@/components/event-card'
import { Card, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { runAction } from '@/lib/api'
import { formatLongDate } from '@/lib/format'
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

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ key: c, label: c }))

const DATE_OPTIONS = [
  { key: 'today', label: 'Hoje' },
  { key: 'tomorrow', label: 'Amanhã' },
  { key: 'weekend', label: 'Este fim de semana' },
  { key: 'week', label: 'Próximos 7 dias' },
  { key: 'month', label: 'Próximos 30 dias' },
  { key: 'day', label: 'Escolher um dia…' },
]

type DateFilter = { key: string; day?: Date } | null
type Filter = { search: string; category: string | null; city: string | null; date: DateFilter }

function startOfDay(date: Date, plusDays = 0) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + plusDays)
  return d
}

// Intervalo [from, to) do filtro de data, no fuso do aparelho
function dateRange(date: NonNullable<DateFilter>): { from: Date; to: Date } {
  const now = new Date()
  switch (date.key) {
    case 'today':
      return { from: now, to: startOfDay(now, 1) }
    case 'tomorrow':
      return { from: startOfDay(now, 1), to: startOfDay(now, 2) }
    case 'weekend': {
      // Sábado e domingo desta semana (no domingo, só o que resta dele)
      const day = now.getDay()
      const saturday = day === 0 ? startOfDay(now, -1) : startOfDay(now, 6 - day)
      return { from: saturday, to: startOfDay(saturday, 2) }
    }
    case 'week':
      return { from: now, to: startOfDay(now, 8) }
    case 'month':
      return { from: now, to: startOfDay(now, 31) }
    default:
      return { from: startOfDay(date.day ?? now), to: startOfDay(date.day ?? now, 1) }
  }
}

function formatDay(date: Date) {
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

// Cidades que têm algum evento por vir, para o filtro
async function fetchCities(): Promise<string[]> {
  const { data } = await supabase
    .from('events')
    .select('city')
    .in('status', ['OPEN', 'PENDING', 'CONFIRMED'])
    .gte('starts_at', new Date().toISOString())
    .limit(1000)
  const cities = new Set((data ?? []).map((row) => row.city?.trim()).filter((city): city is string => !!city))
  return [...cities].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

async function fetchUpcomingEvents(filter: Filter): Promise<ListedEvent[]> {
  const now = new Date()
  const range = filter.date ? dateRange(filter.date) : null
  const from = range && range.from > now ? range.from : now

  let query = supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .in('status', ['OPEN', 'PENDING', 'CONFIRMED'])
    .gte('starts_at', from.toISOString())
    .order('starts_at', { ascending: true })
    .limit(50)

  // % e _ são curingas do ilike, e vírgula e parênteses separam filtros
  const term = filter.search.trim().replace(/[%_,()]/g, ' ')
  if (term) query = query.ilike('title', `%${term}%`)
  if (filter.category) query = query.eq('category', filter.category)
  if (filter.city) query = query.eq('city', filter.city)
  if (range) query = query.lt('starts_at', range.to.toISOString())

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

// Rascunho do organizador; uma série recorrente vira um item só, com quantos
// eventos ela tem ao todo
type Draft = { id: string; title: string; starts_at: string; city: string; seriesSize: number; rule: string | null }

async function fetchDrafts(userId: string): Promise<Draft[]> {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, starts_at, city, parent_event_id, recurrence_rule')
    .eq('organizer_id', userId)
    .eq('status', 'DRAFT')
    .order('starts_at', { ascending: true })
    .limit(200)
  if (error) throw error
  const rows = data ?? []
  return rows
    .filter((row) => !row.parent_event_id || !rows.some((other) => other.id === row.parent_event_id))
    .map((row) => ({
      id: row.id,
      title: row.title,
      starts_at: row.starts_at,
      city: row.city,
      rule: row.recurrence_rule,
      seriesSize: 1 + rows.filter((other) => other.parent_event_id === row.id).length,
    }))
}

function repeatLabel(rule: string | null) {
  if (!rule) return ''
  if (rule.includes('MONTHLY')) return 'todo mês'
  return rule.includes('INTERVAL=2') ? 'a cada 2 semanas' : 'toda semana'
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
  const params = useLocalSearchParams<{ tab?: string }>()
  const [tab, setTab] = useState<Tab>('upcoming')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [busyDraft, setBusyDraft] = useState<string | null>(null)
  const [events, setEvents] = useState<Partial<Record<Tab, ListedEvent[]>>>({})
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [city, setCity] = useState<string | null>(null)
  const [date, setDate] = useState<DateFilter>(null)
  const [cities, setCities] = useState<string[]>([])
  const [pickingDay, setPickingDay] = useState(false)
  const [error, setError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const headerInset = useTabHeaderInset()

  // Ao salvar um rascunho, o formulário volta para cá abrindo Meus eventos
  const [tabParam, setTabParam] = useState(params.tab)
  if (params.tab !== tabParam) {
    setTabParam(params.tab)
    if (params.tab === 'mine') setTab('mine')
  }

  const load = useCallback(
    async (which: Tab, filter: Filter) => {
      try {
        if (which === 'mine') setDrafts(await fetchDrafts(userId))
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
  // Os filtros valem ao escolher; a busca, só ao enviar o campo, não a cada letra.
  useFocusEffect(
    useCallback(() => {
      load(tab, { search, category, city, date })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, tab, category, city, date])
  )

  useFocusEffect(
    useCallback(() => {
      fetchCities().then(setCities)
    }, [])
  )

  async function handleRefresh() {
    setRefreshing(true)
    await Promise.all([load(tab, { search, category, city, date }), fetchCities().then(setCities)])
    setRefreshing(false)
  }

  async function publishDraft(draft: Draft) {
    setBusyDraft(draft.id)
    const result = await runAction('publishEvent', draft.id)
    setBusyDraft(null)
    if ('error' in result) {
      Alert.alert('Não foi possível publicar', result.error)
      return
    }
    await load('mine', { search, category, city, date })
    router.push({ pathname: '/events/[id]', params: { id: draft.id } })
  }

  function confirmDeleteDraft(draft: Draft) {
    Alert.alert(
      'Excluir rascunho?',
      draft.seriesSize > 1 ? `Os ${draft.seriesSize} eventos da série serão excluídos.` : 'Ele não poderá ser recuperado.',
      [
        { text: 'Manter', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setBusyDraft(draft.id)
            const result = await runAction('deleteDraftEvent', draft.id)
            setBusyDraft(null)
            if ('error' in result) Alert.alert('Não foi possível excluir', result.error)
            await load('mine', { search, category, city, date })
          },
        },
      ]
    )
  }

  function chooseDate(key: string | null) {
    if (key === 'day') setPickingDay(true)
    else setDate(key ? { key } : null)
  }

  function chooseDay(day: Date) {
    setPickingDay(false)
    setDate({ key: 'day', day })
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
            <Pressable
              testID="event-new"
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/event-form', params: { mode: 'create' } })}
              style={({ pressed }) => [styles.create, pressed && styles.dim]}>
              <Plus size={18} color={colors.primary} />
              <Text style={styles.createText}>Criar evento</Text>
            </Pressable>
            {tab === 'upcoming' && (
              <>
                <View style={styles.search}>
                  <Search size={16} color={colors.text35} />
                  <TextInput
                    testID="events-search"
                    value={search}
                    onChangeText={setSearch}
                    onSubmitEditing={() => load('upcoming', { search, category, city, date })}
                    placeholder="Buscar evento pelo nome"
                    placeholderTextColor={colors.text35}
                    selectionColor={colors.primary}
                    autoCorrect={false}
                    returnKeyType="search"
                    style={styles.searchInput}
                  />
                </View>
                <View style={styles.filters}>
                  <Dropdown
                    testID="filter-category"
                    placeholder="Categoria"
                    allLabel="Todas as categorias"
                    options={CATEGORY_OPTIONS}
                    selected={category}
                    onSelect={setCategory}
                    style={styles.flex}
                  />
                  <Dropdown
                    testID="filter-date"
                    placeholder="Data"
                    allLabel="Qualquer data"
                    options={DATE_OPTIONS}
                    selected={date?.key ?? null}
                    selectedLabel={date?.day ? formatDay(date.day) : undefined}
                    onSelect={chooseDate}
                    style={styles.flex}
                  />
                  <Dropdown
                    testID="filter-city"
                    placeholder="Cidade"
                    allLabel="Todas as cidades"
                    options={cities.map((c) => ({ key: c, label: c }))}
                    selected={city}
                    onSelect={setCity}
                    style={styles.flex}
                  />
                </View>
              </>
            )}
            {tab === 'mine' && drafts.length > 0 && (
              <View style={styles.drafts}>
                <View style={styles.draftsHeader}>
                  <FilePen size={18} color={colors.warning} />
                  <Text style={styles.draftsTitle}>Rascunhos</Text>
                  <Text style={styles.draftsCount}>{drafts.length}</Text>
                </View>
                <Text style={styles.draftsHint}>Só você vê. Publique quando estiver pronto.</Text>
                {drafts.map((draft, index) => (
                  <DraftCard
                    key={draft.id}
                    testID={`draft-${index}`}
                    draft={draft}
                    busy={busyDraft === draft.id}
                    onEdit={() => router.push({ pathname: '/event-form', params: { mode: 'edit', eventId: draft.id } })}
                    onPublish={() => publishDraft(draft)}
                    onDelete={() => confirmDeleteDraft(draft)}
                  />
                ))}
              </View>
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
      {pickingDay && <DayPicker value={date?.day ?? new Date()} onPick={chooseDay} onCancel={() => setPickingDay(false)} />}
    </Screen>
  )
}

function DraftCard(props: {
  draft: Draft
  busy: boolean
  testID: string
  onEdit: () => void
  onPublish: () => void
  onDelete: () => void
}) {
  const { draft, busy } = props
  return (
    <Card style={styles.draft}>
      <Pressable testID={props.testID} accessibilityRole="button" onPress={props.onEdit} style={styles.draftBody}>
        <Text style={styles.draftTitle} numberOfLines={1}>
          {draft.title}
        </Text>
        <Text style={styles.draftMeta}>
          {formatLongDate(draft.starts_at)} · {draft.city}
        </Text>
        {draft.seriesSize > 1 && (
          <View style={styles.series}>
            <Repeat size={13} color={colors.primary} />
            <Text style={styles.seriesText}>
              Série de {draft.seriesSize} eventos, {repeatLabel(draft.rule)}
            </Text>
          </View>
        )}
      </Pressable>
      <View style={styles.draftActions}>
        <Pressable
          accessibilityRole="button"
          onPress={props.onEdit}
          disabled={busy}
          style={({ pressed }) => [styles.draftButton, pressed && styles.dim]}>
          <Text style={styles.draftButtonText}>Continuar editando</Text>
        </Pressable>
        <Pressable
          testID={`${props.testID}-publish`}
          accessibilityRole="button"
          onPress={props.onPublish}
          disabled={busy}
          style={({ pressed }) => [styles.publishButton, (pressed || busy) && styles.dim]}>
          {busy ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={styles.publishText}>{draft.seriesSize > 1 ? 'Publicar série' : 'Publicar'}</Text>
          )}
        </Pressable>
        <Pressable
          testID={`${props.testID}-delete`}
          accessibilityRole="button"
          accessibilityLabel="Excluir rascunho"
          onPress={props.onDelete}
          disabled={busy}
          hitSlop={8}
          style={({ pressed }) => [styles.deleteButton, pressed && styles.dim]}>
          <Trash2 size={18} color={colors.destructive} />
        </Pressable>
      </View>
    </Card>
  )
}

// Calendário para escolher um dia: no Android, o diálogo do sistema; no iOS,
// o calendário do sistema numa janela por cima da tela
function DayPicker({ value, onPick, onCancel }: { value: Date; onPick: (day: Date) => void; onCancel: () => void }) {
  const picker = (
    <DateTimePicker
      testID="filter-day-picker"
      value={value}
      mode="date"
      display={process.env.EXPO_OS === 'ios' ? 'inline' : 'default'}
      minimumDate={startOfDay(new Date())}
      locale="pt_BR"
      accentColor={colors.primary}
      themeVariant="dark"
      onValueChange={(_, day) => onPick(day)}
      onDismiss={onCancel}
    />
  )
  if (process.env.EXPO_OS !== 'ios') return picker

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Fechar">
        <Pressable style={styles.calendar} onPress={() => {}}>
          <Text style={styles.calendarTitle}>Escolha um dia</Text>
          {picker}
        </Pressable>
      </Pressable>
    </Modal>
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
  create: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 46,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.3)',
    backgroundColor: 'rgba(74,222,128,0.08)',
  },
  createText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },
  dim: { opacity: 0.6 },
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
  filters: { flexDirection: 'row', gap: 8 },
  drafts: { gap: 10 },
  draftsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  draftsTitle: { fontFamily: fonts.headingBlack, fontSize: 20, color: colors.foreground },
  draftsCount: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(250,204,21,0.1)',
    overflow: 'hidden',
  },
  draftsHint: { fontFamily: fonts.body, fontSize: 13, color: colors.text50, marginTop: -4 },
  draft: { padding: 14, gap: 12, borderColor: 'rgba(250,204,21,0.25)', borderStyle: 'dashed' },
  draftBody: { gap: 4 },
  draftTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  draftMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.text50 },
  series: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  seriesText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.primary },
  draftActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  draftButton: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  draftButtonText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },
  publishButton: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  publishText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryForeground },
  deleteButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'center', padding: 16, backgroundColor: 'rgba(0,0,0,0.6)' },
  calendar: {
    padding: 16,
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
  },
  calendarTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.foreground },
  heading: { fontFamily: fonts.headingBlack, fontSize: 24, color: colors.foreground, letterSpacing: -0.5 },
  loading: { marginTop: 64 },
  empty: { alignItems: 'center', gap: 12, marginTop: 64, paddingHorizontal: 24 },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, textAlign: 'center' },
})
