import { router, useFocusEffect } from 'expo-router'
import { Plus, Search, UsersRound } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native'
import { GroupCard, type GroupCardData } from '@/components/group-card'
import { Screen } from '@/components/ui'
import { useSession } from '@/ctx'
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

// Grupos públicos, dos maiores para os menores; a RLS já esconde os privados de quem não é membro
async function fetchPublicGroups(search: string): Promise<ListedGroup[]> {
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

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export default function GroupsScreen() {
  const { session } = useSession()
  const userId = session!.user.id
  const headerInset = useTabHeaderInset()
  const [tab, setTab] = useState<Tab>('mine')
  const [groups, setGroups] = useState<Partial<Record<Tab, ListedGroup[]>>>({})
  const [search, setSearch] = useState('')
  const [error, setError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(
    async (which: Tab, term: string) => {
      try {
        const data = which === 'mine' ? await fetchMyGroups(userId) : await fetchPublicGroups(term)
        setGroups((current) => ({ ...current, [which]: data }))
        setError(false)
      } catch {
        setError(true)
      }
    },
    [userId]
  )

  // Recarrega também ao voltar da página de um grupo: a pessoa pode ter entrado ou saído.
  // A busca só vale ao enviar o campo, não a cada letra.
  useFocusEffect(
    useCallback(() => {
      load(tab, search)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, tab])
  )

  async function handleRefresh() {
    setRefreshing(true)
    await load(tab, search)
    setRefreshing(false)
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
                  onSubmitEditing={() => load('discover', search)}
                  placeholder="Buscar grupo pelo nome"
                  placeholderTextColor={colors.text35}
                  selectionColor={colors.primary}
                  autoCorrect={false}
                  returnKeyType="search"
                  style={styles.searchInput}
                />
              </View>
            ) : (
              <Pressable
                testID="group-new"
                accessibilityRole="button"
                onPress={() => router.push('/groups/new')}
                style={({ pressed }) => [styles.create, pressed && styles.dim]}>
                <Plus size={18} color={colors.primary} />
                <Text style={styles.createText}>Criar grupo</Text>
              </Pressable>
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
  loading: { marginTop: 64 },
  empty: { alignItems: 'center', gap: 12, marginTop: 64, paddingHorizontal: 24 },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, textAlign: 'center' },
})
