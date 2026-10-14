import { router, Stack, useFocusEffect } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Badge, Card, Screen } from '@/components/ui'
import { runAction } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { useHeaderInset } from '@/lib/header'
import { STATUS_LABELS, type EventFinancial } from '@/lib/finance'
import { colors, fonts } from '@/lib/theme'

type Summary = {
  totalGross: number
  totalNet: number
  totalFees: number
  totalEvents: number
  activeEvents: number
  events: EventFinancial[]
}


// Receitas dos eventos que a pessoa organiza, como a página Financeiro do site
export default function FinanceScreen() {
  const headerInset = useHeaderInset()
  const [summary, setSummary] = useState<Summary | null | undefined>(undefined)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const result = await runAction<Summary>('organizerSummary')
    setSummary('ok' in result ? result.ok : null)
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const participants = summary?.events.reduce((sum, event) => sum + event.confirmed_count, 0) ?? 0
  const paidEvents = summary?.events.filter((event) => event.confirmed_count > 0) ?? []
  const ticket = participants ? Math.round((summary?.totalGross ?? 0) / participants) : 0
  const occupancy = paidEvents.length
    ? Math.round((paidEvents.reduce((sum, e) => sum + e.confirmed_count / e.capacity, 0) / paidEvents.length) * 100)
    : 0

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Financeiro' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingTop: 16 + headerInset }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              await load()
              setRefreshing(false)
            }}
            tintColor={colors.primary}
            progressViewOffset={headerInset}
          />
        }>
        {summary === undefined ? (
          <ActivityIndicator style={styles.loading} color={colors.primary} />
        ) : summary === null ? (
          <Text style={styles.empty}>Não foi possível carregar o financeiro.</Text>
        ) : (
          <>
            <Card style={styles.total}>
              <Text style={styles.label}>Receita líquida total</Text>
              <Text testID="finance-net" style={styles.totalValue}>
                {formatMoney(summary.totalNet)}
              </Text>
              <Text style={styles.detail}>
                Bruto: {formatMoney(summary.totalGross)} · Taxas: {formatMoney(summary.totalFees)}
              </Text>
            </Card>
            <View style={styles.stats}>
              <Stat value={String(summary.totalEvents)} label={`Eventos · ${summary.activeEvents} ativos`} />
              <Stat value={String(participants)} label="Participantes" />
              <Stat value={formatMoney(ticket)} label="Ticket médio" />
              <Stat value={`${occupancy}%`} label="Ocupação média" />
            </View>

            <Text style={styles.label}>Por evento</Text>
            {summary.events.length === 0 ? (
              <Text testID="finance-empty" style={styles.empty}>
                Você ainda não organizou eventos.
              </Text>
            ) : (
              summary.events.map((event, index) => (
                <Pressable
                  key={event.id}
                  testID={`finance-event-${index}`}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/finance/[eventId]', params: { eventId: event.id } })}>
                  <Card style={styles.event}>
                    <View style={styles.eventBody}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <View style={styles.badges}>
                        <Badge label={STATUS_LABELS[event.status] ?? event.status} tone="muted" />
                        {event.payout_claimed_at ? <Badge label="Resgatado" tone="primary" /> : null}
                      </View>
                      <Text style={styles.detail}>
                        {event.confirmed_count}/{event.capacity} inscritos · bruto {formatMoney(event.gross_revenue)} · líquido{' '}
                        {formatMoney(event.net_revenue)}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={colors.text35} />
                  </Card>
                </Pressable>
              ))
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  loading: { marginTop: 64 },
  empty: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 24 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.text40 },
  total: { padding: 18, gap: 4 },
  totalValue: { fontFamily: fonts.headingBlack, fontSize: 30, color: colors.primary },
  detail: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.text50 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { flexBasis: '47%', flexGrow: 1, padding: 14, gap: 2 },
  statValue: { fontFamily: fonts.headingBlack, fontSize: 19, color: colors.text },
  statLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.text50 },
  event: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  eventBody: { flex: 1, gap: 6 },
  eventTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  badges: { flexDirection: 'row', gap: 6 },
})
