import { router, useFocusEffect } from 'expo-router'
import { Link2, Plus, Search, UsersRound } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native'
import { Dropdown } from '@/components/dropdown'
import { GroupCard, type GroupCardData } from '@/components/group-card'
import { Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { runAction } from '@/lib/api'
import { useTabHeaderInset } from '@/lib/header'
import { supabase } from '@/lib/supabase'
import { colors, fonts, radius } from '@/lib/theme'

type Tab = 'mine' | 'discover'
type ListedGroup = GroupCardData & { role?: string }

const GROUP_COLUMNS = 'id, name, city, category, visibility, avatar_url, member_count'

const TABS: { key: Tab; label: string; empty: string }[] = [
  { key: 'mine', label: 'Meus grupos', empty: 'Você ainda não participa de nenhum grupo.' },
  { key: 'discover', label: 'Descobrir', empty: 'Nenhum grupo encontrado.' },
]

// Grupos de que a pessoa é membro, públicos ou privados
async function fetchMyGroups(userId: string): Promise<ListedGroup[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select(`role, groups!inner(${GROUP_COLUMNS})`)
    .eq('user_id', userId)
    .limit(100)

  if (error) throw error
  return (data ?? []).map((row) => ({ ...row.groups, role: row.role })).sort((a, b) => a.name.localeCompare(b.name))
}

// Mesma lista do site (src/features/grupos/constants.ts)
const CATEGORIES = ['Esportes', 'Gastronomia', 'Viagens', 'Música', 'Cinema', 'Teatro', 'Arte', 'Tecnologia', 'Negócios', 'Saúde', 'Educação', 'Outros']

// Grupos públicos, dos maiores para os menores; a RLS já esconde os privados de quem não é membro
type Filter = { search: string; category: string | null; city: string | null }

async function fetchPublicGroups({ search, category, city }: Filter): Promise<ListedGroup[]> {
  let query = supabase
    .from('groups')
    .select(GROUP_COLUMNS)
    .eq('visibility', 'PUBLIC')
    .order('member_count', { ascending: false })
    .order('name')
    .limit(50)

  // % e _ são curingas do ilike, e vírgula e parênteses separam filtros
  const term = search.trim().replace(/[%_,()]/g, ' ')
  if (term) query = query.ilike('name', `%${term}%`)
  if (category) query = query.eq('category', category)
  if (city) query = query.eq('city', city)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

// Cidades com algum grupo público, para o filtro
async function fetchGroupCities(): Promise<string[]> {
  const { data } = await supabase.from('groups').select('city').eq('visibility', 'PUBLIC').limit(1000)
  const cities = new Set((data ?? []).map((row) => row.city?.trim()).filter((city): city is string => !!city))
  return [...cities].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export default function GroupsScreen() {
  const { session } = useSession()
  const userId = session!.user.id
  const headerInset = useTabHeaderInset()
  const [tab, setTab] = useState<Tab>('mine')
  const [groups, setGroups] = useState<Partial<Record<Tab, ListedGroup[]>>>({})
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [city, setCity] = useState<string | null>(null)
  const [cities, setCities] = useState<string[]>([])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invite, setInvite] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(
    async (which: Tab, filter: Filter) => {
      try {
        const data = which === 'mine' ? await fetchMyGroups(userId) : await fetchPublicGroups(filter)
        setGroups((current) => ({ ...current, [which]: data }))
        setError(false)
      } catch {
        setError(true)
      }
    },
    [userId]
  )

  // Recarrega também ao voltar da página de um grupo: a pessoa pode ter entrado ou saído.
  // Os filtros valem ao escolher; a busca, só ao enviar o campo, não a cada letra.
  useFocusEffect(
    useCallback(() => {
      load(tab, { search, category, city })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, tab, category, city])
  )

  useFocusEffect(
    useCallback(() => {
      fetchGroupCities().then(setCities)
    }, [])
  )

  async function handleRefresh() {
    setRefreshing(true)
    await Promise.all([load(tab, { search, category, city }), fetchGroupCities().then(setCities)])
    setRefreshing(false)
  }

  // Link de convite do site (.../grupos/entrar/<código>) ou só o código
  async function joinByInvite() {
    const text = invite.trim()
    // Link da página do grupo (tanalista.app/g/<slug>): abre o grupo, onde
    // dá para entrar (público) ou pedir para entrar (privado)
    const page = text.match(/\/g\/([^/?#\s]+)/)
    if (page) {
      setInvite('')
      setInviteOpen(false)
      router.push({ pathname: '/groups/preview/[slug]', params: { slug: page[1] } })
      return
    }
    const token = text.split('/').filter(Boolean).pop() ?? ''
    if (!token) return
    setJoining(true)
    setInviteError(null)
    const result = await runAction<{ groupId?: string }>('joinGroupByInvite', token)
    setJoining(false)
    if ('ok' in result && result.ok.groupId) {
      setInvite('')
      setInviteOpen(false)
      router.push({ pathname: '/groups/[id]', params: { id: result.ok.groupId } })
    } else {
      setInviteError('error' in result ? result.error : 'Convite inválido ou expirado.')
    }
  }

  const current = TABS.find((t) => t.key === tab)!
  const listed = groups[tab]

  return (
    <Screen>
      <FlatList
        data={listed ?? []}
        keyExtractor={(group) => group.id}
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
                  testID={`groups-${t.key}`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: t.key === tab }}
                  onPress={() => setTab(t.key)}
                  style={[styles.tab, t.key === tab && styles.tabActive]}>
                  <Text style={[styles.tabText, t.key === tab && styles.tabTextActive]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            {tab === 'discover' ? (
              <View style={styles.search}>
                <Search size={16} color={colors.text35} />
                <TextInput
                  testID="groups-search"
                  value={search}
                  onChangeText={setSearch}
                  onSubmitEditing={() => load('discover', { search, category, city })}
                  placeholder="Buscar grupo pelo nome"
                  placeholderTextColor={colors.text35}
                  selectionColor={colors.primary}
                  autoCorrect={false}
                  returnKeyType="search"
                  style={styles.searchInput}
                />
              </View>
            ) : (
              <>
                <Pressable
                  testID="group-new"
                  accessibilityRole="button"
                  onPress={() => router.push('/groups/new')}
                  style={({ pressed }) => [styles.create, pressed && styles.dim]}>
                  <Plus size={18} color={colors.primary} />
                  <Text style={styles.createText}>Criar grupo</Text>
                </Pressable>
                {inviteOpen ? (
                  <View style={styles.inviteRow}>
                    <TextInput
                      testID="group-invite-code"
                      value={invite}
                      onChangeText={setInvite}
                      placeholder="Cole o link do grupo ou do convite"
                      placeholderTextColor={colors.text35}
                      selectionColor={colors.primary}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onSubmitEditing={joinByInvite}
                      style={styles.inviteInput}
                    />
                    <Pressable
                      testID="group-invite-join"
                      accessibilityRole="button"
                      onPress={joinByInvite}
                      disabled={joining}
                      style={styles.inviteButton}>
                      {joining ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.createText}>Entrar</Text>}
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    testID="group-invite"
                    accessibilityRole="button"
                    onPress={() => setInviteOpen(true)}
                    style={styles.inviteLink}>
                    <Link2 size={16} color={colors.primary} />
                    <Text style={styles.inviteLinkText}>Tenho um convite</Text>
                  </Pressable>
                )}
                {inviteError && <Text style={styles.inviteError}>{inviteError}</Text>}
              </>
            )}
            {tab === 'discover' && (
              <View style={styles.filters}>
                <Dropdown
                  testID="group-filter-category"
                  placeholder="Categoria"
                  allLabel="Todas as categorias"
                  options={CATEGORIES.map((item) => ({ key: item, label: item }))}
                  selected={category}
                  onSelect={setCategory}
                  style={styles.flex}
                />
                <Dropdown
                  testID="group-filter-city"
                  placeholder="Cidade"
                  allLabel="Todas as cidades"
                  options={cities.map((item) => ({ key: item, label: item }))}
                  selected={city}
                  onSelect={setCity}
                  style={styles.flex}
                />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          listed === undefined && !error ? (
            <ActivityIndicator style={styles.loading} color={colors.primary} />
          ) : (
            <View style={styles.empty}>
              <UsersRound size={36} color={colors.text25} />
              <Text testID="groups-empty" style={styles.emptyText}>
                {error ? 'Não foi possível carregar os grupos. Puxe para tentar de novo.' : current.empty}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            role={item.role}
            onPress={() => router.push({ pathname: '/groups/[id]', params: { id: item.id } })}
          />
        )}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  header: { gap: 14, marginBottom: 4 },
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
  create: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.3)',
    backgroundColor: 'rgba(74,222,128,0.08)',
  },
  createText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },
  dim: { opacity: 0.6 },
  inviteRow: { flexDirection: 'row', gap: 8 },
  inviteInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: 16,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.foreground,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  inviteButton: {
    minWidth: 84,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.3)',
  },
  inviteLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 36 },
  inviteLinkText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },
  inviteError: { fontFamily: fonts.body, fontSize: 13, color: colors.destructive, textAlign: 'center' },
  filters: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  loading: { marginTop: 64 },
  empty: { alignItems: 'center', gap: 12, marginTop: 64, paddingHorizontal: 24 },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, textAlign: 'center' },
})
