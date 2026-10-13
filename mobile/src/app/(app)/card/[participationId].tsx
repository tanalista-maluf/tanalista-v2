import { router, Stack, useLocalSearchParams } from 'expo-router'
import { CheckCheck, Clock } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import { Button, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { apiUrl, createCardPayment, type CardToken } from '@/lib/api'
import { formatPrice } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { colors, fonts } from '@/lib/theme'

type Summary = { title: string; amount: number }

// O valor cobrado é o preço do evento menos o desconto de cupom da inscrição
async function fetchSummary(participationId: string): Promise<Summary | null> {
  const { data } = await supabase
    .from('participations')
    .select('discount_cents, events(title, price)')
    .eq('id', participationId)
    .maybeSingle()

  const event = data?.events as unknown as { title: string; price: number } | null
  if (!data || !event) return null
  return { title: event.title, amount: Math.max(0, event.price - (data.discount_cents ?? 0)) }
}

type State =
  | { kind: 'form' }
  | { kind: 'paying' }
  | { kind: 'approved' }
  | { kind: 'in_process' }
  // retry: a inscrição continua pendente e dá para tentar de novo
  | { kind: 'error'; message: string; retry: boolean }

// Pagamento com cartão. Os dados do cartão são digitados no formulário do
// Mercado Pago, numa página do site aberta aqui dentro; o app recebe só um
// token de uso único e pede a cobrança ao servidor.
export default function CardScreen() {
  const { participationId } = useLocalSearchParams<{ participationId: string }>()
  const { session } = useSession()
  const [summary, setSummary] = useState<Summary | null | undefined>(undefined)
  const [state, setState] = useState<State>({ kind: 'form' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    fetchSummary(participationId).then((result) => active && setSummary(result))
    return () => {
      active = false
    }
  }, [participationId])

  async function pay(card: CardToken) {
    setState({ kind: 'paying' })
    const result = await createCardPayment(participationId, card)
    if (!('error' in result)) {
      setState({ kind: result.status })
      return
    }
    // Cartão recusado cancela a inscrição; em outros erros ela segue pendente
    const { data } = await supabase.from('participations').select('status').eq('id', participationId).maybeSingle()
    setState({ kind: 'error', message: result.error, retry: data?.status === 'PENDING' })
  }

  function handleMessage(event: WebViewMessageEvent) {
    if (state.kind !== 'form') return
    try {
      const message = JSON.parse(event.nativeEvent.data)
      if (message?.type === 'card' && typeof message.data?.token === 'string') pay(message.data)
    } catch {
      // mensagem que não é do formulário
    }
  }

  const header = <Stack.Screen options={{ title: 'Cartão de crédito', headerTransparent: false }} />

  if (summary === undefined) {
    return (
      <Screen>
        {header}
        <ActivityIndicator style={styles.flex} color={colors.primary} />
      </Screen>
    )
  }

  if (summary === null) {
    return (
      <Screen>
        {header}
        <Text style={styles.message}>Inscrição não encontrada.</Text>
      </Screen>
    )
  }

  if (state.kind === 'approved' || state.kind === 'in_process' || state.kind === 'error') {
    return (
      <Screen>
        {header}
        <View style={styles.result}>
          {state.kind === 'approved' ? (
            <CheckCheck size={44} color={colors.primary} />
          ) : state.kind === 'in_process' ? (
            <Clock size={44} color={colors.warning} />
          ) : null}
          <Text
            testID={state.kind === 'approved' ? 'card-confirmed' : state.kind === 'error' ? 'card-error' : 'card-in-process'}
            style={[styles.resultText, state.kind === 'error' && styles.errorText]}>
            {state.kind === 'approved'
              ? 'Pagamento confirmado!'
              : state.kind === 'in_process'
                ? 'Seu pagamento está em análise. A inscrição é confirmada assim que o Mercado Pago aprovar.'
                : state.message}
          </Text>
          {state.kind === 'error' && state.retry ? (
            <Button
              testID="card-retry"
              label="Tentar de novo"
              onPress={() => {
                setAttempt((n) => n + 1)
                setState({ kind: 'form' })
              }}
            />
          ) : null}
          <Button
            testID="card-done"
            label={state.kind === 'approved' ? 'Concluir' : 'Voltar ao evento'}
            onPress={() => router.back()}
          />
        </View>
      </Screen>
    )
  }

  const query = `amount=${summary.amount}&email=${encodeURIComponent(session?.user.email ?? '')}`

  return (
    <Screen>
      {header}
      <View style={styles.summary}>
        <Text style={styles.title} numberOfLines={1}>
          {summary.title}
        </Text>
        <Text testID="card-amount" style={styles.amount}>
          {formatPrice(summary.amount)}
        </Text>
      </View>
      <WebView
        key={attempt}
        testID="card-form"
        source={{ uri: `${apiUrl}/embed/cartao?${query}` }}
        onMessage={handleMessage}
        startInLoadingState
        renderLoading={() => <ActivityIndicator style={styles.loading} color={colors.primary} />}
        setSupportMultipleWindows={false}
        style={styles.webview}
        containerStyle={styles.webview}
      />
      {state.kind === 'paying' && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.overlayText}>Processando pagamento…</Text>
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  message: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center', marginTop: 80, fontSize: 15 },
  summary: { alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontFamily: fonts.body, fontSize: 14, color: colors.text50 },
  amount: { fontFamily: fonts.headingBlack, fontSize: 28, color: colors.primary },
  webview: { flex: 1, backgroundColor: colors.background },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: 'rgba(13,26,20,0.92)',
  },
  overlayText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.foreground },
  result: { flex: 1, justifyContent: 'center', alignItems: 'stretch', gap: 18, padding: 24 },
  resultText: { fontFamily: fonts.bodyMedium, fontSize: 17, lineHeight: 24, color: colors.foreground, textAlign: 'center' },
  errorText: { color: colors.destructive },
})
