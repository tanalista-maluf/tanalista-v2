import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { FileDown } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { Button, Card, Screen } from '@/components/ui'
import { runAction } from '@/lib/api'
import { formatLongDate, formatMoney } from '@/lib/format'
import { useHeaderInset } from '@/lib/header'
import { STATUS_LABELS, type EventFinancial } from '@/lib/finance'
import { colors, fonts } from '@/lib/theme'

type Detail = {
  event: (EventFinancial & { payout_claimed_at: string | null }) | null
  participants: {
    participation_id: string
    name: string
    email: string
    joined_at: string
    payment_method: string | null
    payment_amount: number | null
  }[]
  byMethod: Record<string, { count: number; total: number }>
}

const METHODS: Record<string, string> = { PIX: 'PIX', CREDIT_CARD: 'Cartão', WALLET: 'Carteira' }

// Financeiro de um evento: totais, por forma de pagamento, inscritos e o resgate da receita
export default function EventFinanceScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>()
  const headerInset = useHeaderInset()
  const [detail, setDetail] = useState<Detail | null | undefined>(undefined)
  const [claiming, setClaiming] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    const result = await runAction<Detail>('eventFinancial', eventId)
    setDetail('ok' in result && result.ok.event ? result.ok : null)
  }, [eventId])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  async function claim() {
    setClaiming(true)
    setMessage(null)
    const result = await runAction<{ net_cents: number }>('claimEventPayout', eventId)
    setMessage(
      'ok' in result
        ? { ok: true, text: `${formatMoney(result.ok.net_cents)} foram para a sua carteira.` }
        : { ok: false, text: 'error' in result ? result.error : 'Não foi possível resgatar.' }
    )
    await load()
    setClaiming(false)
  }

  async function exportCsv() {
    if (!detail?.event) return
    const lines = [
      'nome;email;inscricao;pagamento;valor',
      ...detail.participants.map((p) =>
        [
          p.name,
          p.email,
          new Date(p.joined_at).toLocaleString('pt-BR'),
          p.payment_method ? (METHODS[p.payment_method] ?? p.payment_method) : '',
          p.payment_amount != null ? (p.payment_amount / 100).toFixed(2).replace('.', ',') : '',
        ].join(';')
      ),
    ]
    await Share.share({ title: `Financeiro - ${detail.event.title}`, message: lines.join('\n') })
  }

  if (detail === undefined) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Financeiro do evento' }} />
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      </Screen>
    )
  }

  if (detail === null || !detail.event) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Financeiro do evento' }} />
        <Text style={styles.empty}>Financeiro indisponível para este evento.</Text>
      </Screen>
    )
  }

  const event = detail.event
  const started = new Date(event.starts_at) < new Date()
  const canClaim = started && !event.payout_claimed_at && event.net_revenue > 0 && event.status !== 'CANCELLED'

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Financeiro do evento' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingTop: 16 + headerInset }]}>
        <Card style={styles.hero}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.detail}>
            {STATUS_LABELS[event.status] ?? event.status} · {formatLongDate(event.starts_at)}
          </Text>
          <View style={styles.totals}>
            <Total label="Bruto" value={formatMoney(event.gross_revenue)} />
            <Total label="Taxas" value={formatMoney(event.platform_fees + event.gateway_fees)} />
            <Total label="Líquido" value={formatMoney(event.net_revenue)} strong />
          </View>
        </Card>

        {event.payout_claimed_at ? (
          <Text testID="payout-claimed" style={styles.notice}>
            Receita resgatada em {formatLongDate(event.payout_claimed_at)}.
          </Text>
        ) : canClaim ? (
          <Button
            testID="payout-claim"
            label={`Resgatar ${formatMoney(event.net_revenue)} para a carteira`}
            onPress={() =>
              Alert.alert('Resgatar a receita?', 'O valor líquido vai para a sua carteira TáNaLista.', [
                { text: 'Voltar', style: 'cancel' },
                { text: 'Resgatar', onPress: claim },
              ])
            }
            loading={claiming}
          />
        ) : (
          <Text style={styles.detail}>
            {started ? 'Sem valor a resgatar.' : 'O resgate fica disponível depois que o evento acontecer.'}
          </Text>
        )}
        {message && <Text style={[styles.notice, !message.ok && styles.error]}>{message.text}</Text>}

        {Object.keys(detail.byMethod).length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.label}>Por forma de pagamento</Text>
            {Object.entries(detail.byMethod).map(([method, value]) => (
              <View key={method} style={styles.row}>
                <Text style={styles.rowTitle}>{METHODS[method] ?? method}</Text>
                <Text style={styles.detail}>
                  {value.count} · {formatMoney(value.total)}
                </Text>
              </View>
            ))}
          </Card>
        )}

        <Card style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Inscritos ({detail.participants.length})</Text>
            {detail.participants.length > 0 && (
              <Pressable testID="finance-export" accessibilityRole="button" onPress={exportCsv} style={styles.inline}>
                <FileDown size={15} color={colors.primary} />
                <Text style={styles.link}>Exportar</Text>
              </Pressable>
            )}
          </View>
          {detail.participants.map((participant) => (
            <View key={participant.participation_id} style={styles.row}>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{participant.name}</Text>
                <Text style={styles.detail}>{participant.email}</Text>
              </View>
              <Text style={styles.detail}>
                {participant.payment_method ? (METHODS[participant.payment_method] ?? participant.payment_method) : '—'}
                {participant.payment_amount != null ? ` · ${formatMoney(participant.payment_amount)}` : ''}
              </Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  )
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.total}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={[styles.totalValue, strong && styles.totalStrong]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  loading: { marginTop: 64 },
  empty: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 120, padding: 24 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  hero: { padding: 18, gap: 8 },
  title: { fontFamily: fonts.headingBlack, fontSize: 20, lineHeight: 25, color: colors.text },
  totals: { flexDirection: 'row', gap: 8, marginTop: 6 },
  total: { flex: 1, gap: 2, padding: 10, borderRadius: 12, backgroundColor: colors.input },
  totalLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.text50 },
  totalValue: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  totalStrong: { color: colors.primary },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.text40 },
  detail: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.text50 },
  notice: { fontFamily: fonts.body, fontSize: 14, color: colors.primary, textAlign: 'center' },
  error: { color: colors.destructive },
  section: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  link: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.primary },
})
