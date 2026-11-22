import { router, Stack, useLocalSearchParams } from 'expo-router'
import { CheckCheck, Clock } from 'lucide-react-native'
import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import { Button, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { apiUrl, createCardDeposit, type CardToken } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { cardDepositCredit } from '@/lib/money'
import { colors, fonts } from '@/lib/theme'

// Até quantas parcelas a recarga aceita
const MAX_INSTALLMENTS = 12

type State =
  | { kind: 'form' }
  | { kind: 'paying' }
  | { kind: 'approved' | 'in_process'; credited: number }
  | { kind: 'error'; message: string }

// Recarga da carteira com cartão, no mesmo formulário do Mercado Pago da
// inscrição (página do site aberta aqui dentro), com parcelamento. O crédito
// é o valor menos a taxa: 3% à vista, 5% parcelado.
export default function WalletCardScreen() {
  const { amount: amountParam } = useLocalSearchParams<{ amount: string }>()
  const amount = Number.parseInt(amountParam ?? '', 10)
  const { session } = useSession()
  const [state, setState] = useState<State>({ kind: 'form' })
  const [attempt, setAttempt] = useState(0)

  async function pay(card: CardToken) {
    setState({ kind: 'paying' })
    const result = await createCardDeposit(amount, card)
    if ('error' in result) setState({ kind: 'error', message: result.error })
    else setState({ kind: result.status, credited: result.credited })
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

  const header = <Stack.Screen options={{ title: 'Recarga com cartão', headerTransparent: false }} />

  if (!Number.isFinite(amount) || amount <= 0) {
    return (
      <Screen>
        {header}
        <Text style={styles.message}>Valor inválido.</Text>
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
            testID={state.kind === 'approved' ? 'card-deposit-confirmed' : state.kind === 'error' ? 'card-deposit-error' : 'card-deposit-in-process'}
            style={[styles.resultText, state.kind === 'error' && styles.errorText]}>
            {state.kind === 'error'
              ? state.message
              : state.kind === 'approved'
                ? `Recarga confirmada! ${formatMoney(state.credited)} já estão na sua carteira.`
                : `Seu pagamento está em análise. ${formatMoney(state.credited)} entram na carteira assim que o Mercado Pago aprovar.`}
          </Text>
          {state.kind === 'error' ? (
            <Button
              testID="card-deposit-retry"
              label="Tentar outro cartão"
              onPress={() => {
                setAttempt((n) => n + 1)
                setState({ kind: 'form' })
              }}
            />
          ) : (
            // Volta para a carteira, por baixo da tela de valor da recarga
            <Button testID="card-deposit-done" label="Voltar à carteira" onPress={() => router.dismissTo('/wallet')} />
          )}
        </View>
      </Screen>
    )
  }

  const query = `amount=${amount}&installments=${MAX_INSTALLMENTS}&email=${encodeURIComponent(session?.user.email ?? '')}`

  return (
    <Screen>
      {header}
      <View style={styles.summary}>
        <Text testID="card-deposit-amount" style={styles.amount}>
          {formatMoney(amount)}
        </Text>
        <Text style={styles.fee}>
          Entram {formatMoney(cardDepositCredit(amount, 1))} à vista (taxa de 3%) ou{' '}
          {formatMoney(cardDepositCredit(amount, 2))} parcelado (taxa de 5%)
        </Text>
      </View>
      <WebView
        key={attempt}
        testID="card-deposit-form"
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
  message: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center', marginTop: 80, fontSize: 15 },
  summary: { alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  amount: { fontFamily: fonts.headingBlack, fontSize: 28, color: colors.primary },
  fee: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.warning, textAlign: 'center' },
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
