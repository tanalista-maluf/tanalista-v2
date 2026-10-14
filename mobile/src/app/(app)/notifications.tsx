import { router, Stack, useFocusEffect } from 'expo-router'
import { Bell, BellOff } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { markNotificationsRead } from '@/lib/api'
import { formatRelative } from '@/lib/format'
import { useHeaderInset } from '@/lib/header'
import { supabase } from '@/lib/supabase'
import { colors, fonts, radius } from '@/lib/theme'

type Notification = {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  created_at: string
  data: Record<string, unknown> | null
}

async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, read, created_at, data')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as Notification[]
}

// Para onde a notificação leva: o evento ou o grupo de que ela fala
function target(notification: Notification) {
  const data = notification.data ?? {}
  if (typeof data.event_id === 'string') return { pathname: '/events/[id]' as const, params: { id: data.event_id } }
  if (typeof data.group_id === 'string') return { pathname: '/groups/[id]' as const, params: { id: data.group_id } }
  return null
}

export default function NotificationsScreen() {
  const { session } = useSession()
  const userId = session!.user.id
  const headerInset = useHeaderInset()
  const [items, setItems] = useState<Notification[] | null | undefined>(undefined)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      setItems(await fetchNotifications(userId))
    } catch {
      setItems(null)
    }
  }, [userId])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  async function handleRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  async function open(notification: Notification) {
    if (!notification.read) {
      setItems((current) => current?.map((item) => (item.id === notification.id ? { ...item, read: true } : item)))
      markNotificationsRead(notification.id)
    }
    const destination = target(notification)
    if (destination) router.push(destination)
  }

  async function markAll() {
    setItems((current) => current?.map((item) => ({ ...item, read: true })))
    await markNotificationsRead()
    await load()
  }

  const unread = items?.filter((item) => !item.read).length ?? 0

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: 'Notificações',
          headerRight: () =>
            unread > 0 ? (
              <Pressable testID="notifications-read-all" accessibilityRole="button" onPress={markAll} hitSlop={10}>
                <Text style={styles.readAll}>Ler todas</Text>
              </Pressable>
            ) : null,
        }}
      />
      <FlatList
        data={items ?? []}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
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
          items && items.length > 0 ? (
            <Text testID="notifications-count" style={styles.count}>
              {unread === 0 ? 'Tudo lido' : unread === 1 ? '1 não lida' : `${unread} não lidas`}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          items === undefined ? (
            <ActivityIndicator style={styles.loading} color={colors.primary} />
          ) : (
            <View style={styles.empty}>
              <BellOff size={36} color={colors.text25} />
              <Text testID="notifications-empty" style={styles.emptyText}>
                {items === null ? 'Não foi possível carregar. Puxe para tentar de novo.' : 'Nenhuma notificação ainda.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <Pressable
            testID={`notification-${index}`}
            accessibilityRole="button"
            accessibilityLabel={`${item.read ? '' : 'Não lida. '}${item.title}. ${item.body}`}
            onPress={() => open(item)}
            style={({ pressed }) => [styles.item, !item.read && styles.itemUnread, pressed && styles.pressed]}>
            <View style={[styles.icon, !item.read && styles.iconUnread]}>
              <Bell size={17} color={item.read ? colors.text40 : colors.primary} />
            </View>
            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, item.read && styles.titleRead]}>{item.title}</Text>
                {!item.read && <View style={styles.dot} />}
              </View>
              <Text style={styles.text}>{item.body}</Text>
              <Text style={styles.date}>{formatRelative(item.created_at)}</Text>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  readAll: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },
  count: { fontFamily: fonts.body, fontSize: 13, color: colors.text50, marginBottom: 2 },
  loading: { marginTop: 64 },
  empty: { alignItems: 'center', gap: 12, marginTop: 64, paddingHorizontal: 24 },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, textAlign: 'center' },
  item: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  itemUnread: { borderColor: 'rgba(74,222,128,0.25)', backgroundColor: 'rgba(74,222,128,0.05)' },
  pressed: { opacity: 0.7 },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconUnread: { backgroundColor: 'rgba(74,222,128,0.12)' },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  titleRead: { fontFamily: fonts.bodySemi, color: colors.text70 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  text: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text50 },
  date: { fontFamily: fonts.body, fontSize: 12, color: colors.text35 },
})
