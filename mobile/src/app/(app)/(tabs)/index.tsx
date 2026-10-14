import { router, useFocusEffect } from 'expo-router'
import { CalendarDays, ChevronRight, UsersRound } from 'lucide-react-native'
import { useCallback, useState, type ReactNode } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Avatar } from '@/components/avatar'
import { EventCard, type EventCardBadge, type EventCardData } from '@/components/event-card'
import { Card, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { fetchHome, fetchWalletBalance, type GroupActivity } from '@/lib/api'
import { formatMoney, formatRelative } from '@/lib/format'
import { useTabHeaderInset } from '@/lib/header'
import { supabase } from '@/lib/supabase'
import { colors, fonts } from '@/lib/theme'

type MyEvent = EventCardData & { participationStatus: string }

// Os próximos eventos em que a pessoa está inscrita (confirmada ou aguardando pagamento)
async function fetchMyNextEvents(userId: string): Promise<MyEvent[]> {
  const { data } = await supabase
    .from('participations')
    .select(
      'status, events!inner(id, title, starts_at, city, price, capacity, confirmed_count, visibility, status, groups(name))'
    )
    .eq('user_id', userId)
    .in('status', ['CONFIRMED', 'PENDING'])
    .neq('events.status', 'CANCELLED')
    .gte('events.starts_at', new Date().toISOString())
    .limit(50)

  return (data ?? [])
    .map((row) => ({ ...row.events, participationStatus: row.status }))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, 3)
}

async function fetchAll(userId: string) {
  const [events, wallet, home] = await Promise.all([fetchMyNextEvents(userId), fetchWalletBalance(), fetchHome()])
  return {
    events,
    balance: 'balance' in wallet ? wallet.balance : null,
    activity: 'activity' in home ? home.activity : [],
  }
}

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
}

function badge(status: string): EventCardBadge {
  return status === 'CONFIRMED' ? { label: 'Inscrito', tone: 'primary' } : { label: 'Pendente', tone: 'warning' }
}

// Tela inicial, como a do site: saudação, saldo, próximos eventos da pessoa e
// o que anda acontecendo nos grupos dela
export default function HomeScreen() {
  const { session, profile } = useSession()
  const userId = session!.user.id
  const headerInset = useTabHeaderInset()
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAll>> | undefined>(undefined)
  const [refreshing, setRefreshing] = useState(false)

  useFocusEffect(
    useCallback(() => {
      let active = true
      fetchAll(userId).then((result) => {
        if (active) setData(result)
      })
      return () => {
        active = false
      }
    }, [userId])
  )

  async function handleRefresh() {
    setRefreshing(true)
    setData(await fetchAll(userId))
    setRefreshing(false)
  }

  const firstName = profile?.full_name?.trim().split(/\s+/)[0]
  const events = data?.events ?? []

  return (
    <Screen>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.content, { paddingTop: 20 + headerInset }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            progressViewOffset={headerInset}
          />
        }>
        <View>
          <Text testID="home-greeting" style={styles.greeting}>
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </Text>
          <Text style={styles.subtitle}>
            {data === undefined
              ? ' '
              : events.length === 0
                ? 'Explore eventos e inscreva-se'
                : events.length === 1
                  ? 'Você tem 1 evento por vir'
                  : `Seus próximos ${events.length} eventos`}
          </Text>
        </View>

        {data?.balance != null && (
          <Card style={styles.balance}>
            <Text style={styles.label}>Saldo disponível</Text>
            <Text testID="home-balance" style={styles.balanceValue}>
              {formatMoney(data.balance)}
            </Text>
            <Text style={styles.balanceHint}>Vale como pagamento nas inscrições.</Text>
          </Card>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Seus eventos</Text>
            <Pressable testID="home-all-events" accessibilityRole="button" onPress={() => router.push('/events')} hitSlop={10}>
              <Text style={styles.link}>Ver todos</Text>
            </Pressable>
          </View>
          {data !== undefined && events.length === 0 ? (
            <Card style={styles.empty}>
              <CalendarDays size={28} color={colors.text25} />
              <Text testID="home-no-events" style={styles.emptyText}>
                Nenhum evento próximo.
              </Text>
            </Card>
          ) : (
            events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                badge={badge(event.participationStatus)}
                onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
              />
            ))
          )}
        </View>

        {data && data.activity.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Atividade nos grupos</Text>
            <Card style={styles.activity}>
              {data.activity.map((item, index) => (
                <ActivityRow key={item.id} item={item} divider={index > 0} />
              ))}
            </Card>
          </View>
        )}

        <View style={styles.section}>
          <Card>
            <Shortcut
              testID="home-explore"
              icon={<CalendarDays size={19} color={colors.primary} />}
              title="Explorar eventos"
              detail="Descubra eventos perto de você"
              onPress={() => router.push('/events')}
            />
            <Shortcut
              testID="home-groups"
              icon={<UsersRound size={19} color={colors.primary} />}
              title="Meus grupos"
              detail="Veja e crie grupos"
              onPress={() => router.push('/groups')}
              divider
            />
          </Card>
        </View>
      </ScrollView>
    </Screen>
  )
}

function ActivityRow({ item, divider }: { item: GroupActivity; divider: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/events/[id]', params: { id: item.eventId } })}
      style={[styles.activityRow, divider && styles.divider]}>
      <Avatar name={item.userName} url={item.avatarUrl} size={36} />
      <View style={styles.activityBody}>
        <Text style={styles.activityText}>
          <Text style={styles.activityStrong}>{item.userName}</Text> se inscreveu em{' '}
          <Text style={styles.activityStrong}>{item.eventTitle}</Text>
        </Text>
        <Text style={styles.activityMeta}>
          {item.groupName ? `${item.groupName} · ` : ''}
          {formatRelative(item.at)}
        </Text>
      </View>
    </Pressable>
  )
}

function Shortcut(props: {
  testID: string
  icon: ReactNode
  title: string
  detail: string
  onPress: () => void
  divider?: boolean
}) {
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={`${props.title}. ${props.detail}`}
      onPress={props.onPress}
      style={({ pressed }) => [styles.shortcut, props.divider && styles.divider, pressed && styles.dim]}>
      {props.icon}
      <View style={styles.activityBody}>
        <Text style={styles.shortcutTitle}>{props.title}</Text>
        <Text style={styles.activityMeta}>{props.detail}</Text>
      </View>
      <ChevronRight size={18} color={colors.text35} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 20, paddingBottom: 32 },
  greeting: { fontFamily: fonts.headingBlack, fontSize: 24, letterSpacing: -0.5, color: colors.text },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.text50, marginTop: 2 },
  balance: { padding: 18, gap: 4 },
  balanceValue: { fontFamily: fonts.headingBlack, fontSize: 28, color: colors.primary },
  balanceHint: { fontFamily: fonts.body, fontSize: 13, color: colors.text50 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.text40 },
  link: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.primary },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  activity: { paddingHorizontal: 14 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  activityBody: { flex: 1, gap: 2 },
  activityText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: colors.text70 },
  activityStrong: { fontFamily: fonts.bodySemi, color: colors.text },
  activityMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.text50 },
  shortcut: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  shortcutTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  dim: { opacity: 0.6 },
})
