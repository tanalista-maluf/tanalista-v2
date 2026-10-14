import * as Clipboard from 'expo-clipboard'
import { router, Stack } from 'expo-router'
import { CheckCheck, Copy } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Image, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button, Card, Field, Screen } from '@/components/ui'
import { createDeposit, fetchWalletBalance, type PixPayment } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { useHeaderInset } from '@/lib/header'
import { parseMoney } from '@/lib/money'
import { colors, fonts, radius } from '@/lib/theme'

const POLL_INTERVAL = 3000
const QUICK_AMOUNTS = [2000, 5000, 10000]
// Mesmos limites do servidor (src/features/carteira/wallet.ts)
const MIN_CENTS = 1000
const MAX_CENTS = 500000

// Recarga da carteira por PIX: o saldo entra quando o Mercado Pago confirma o pagamento
export default function DepositScreen() {
  const headerInset = useHeaderInset()
  const [amountText, setAmountText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [pix, setPix] = useState<{ payment: PixPayment; amount: number; startBalance: number } | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleCreate() {
    const amount = parseMoney(amountText)
    if (!amount || amount < MIN_CENTS) {
      setError(`Valor mínimo para recarga: ${formatMoney(MIN_CENTS)}.`)
      return
    }
    if (amount > MAX_CENTS) {
      setError(`Valor máximo por recarga: ${formatMoney(MAX_CENTS)}.`)
      return
    }
    setCreating(true)
    setError(null)
    // O saldo de antes serve para perceber quando a recarga entrou
    const balance = await fetchWalletBalance()
    const result = await createDeposit(amount)
    setCreating(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setPix({ payment: result, amount, startBalance: 'balance' in balance ? balance.balance : 0 })
  }

  // Espera a confirmação: o webhook do Mercado Pago credita o saldo no servidor
  useEffect(() => {
    if (!pix || confirmed) return
    const timer = setInterval(async () => {
      const balance = await fetchWalletBalance()
      if ('balance' in balance && balance.balance >= pix.startBalance + pix.amount) setConfirmed(true)
    }, POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [pix, confirmed])

  async function copyCode() {
    if (!pix?.payment.qr_code) return
    await Clipboard.setStringAsync(pix.payment.qr_code)
    setCopied(true)
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Adicionar saldo' }} />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: 20 + headerInset }]}>
          {confirmed && pix ? (
            <View testID="deposit-confirmed" style={styles.state}>
              <View style={styles.stateIcon}>
                <CheckCheck size={32} color={colors.primary} />
              </View>
              <Text style={styles.stateTitle}>Recarga confirmada!</Text>
              <Text style={styles.hint}>{formatMoney(pix.amount)} já estão na sua carteira.</Text>
              <Button testID="deposit-done" label="Voltar à carteira" onPress={() => router.back()} style={styles.wide} />
            </View>
          ) : pix ? (
            <>
              <View style={styles.summary}>
                <Text style={styles.label}>Recarga via PIX</Text>
                <Text testID="deposit-amount-value" style={styles.amount}>
                  {formatMoney(pix.amount)}
                </Text>
              </View>
              <Card style={styles.codeCard}>
                <Text style={styles.label}>PIX Copia e Cola</Text>
                <Text testID="pix-code" style={styles.code} numberOfLines={3} selectable>
                  {pix.payment.qr_code}
                </Text>
                <Button
                  testID="copy-pix"
                  label={copied ? 'Código copiado' : 'Copiar código'}
                  icon={
                    copied ? (
                      <CheckCheck size={18} color={colors.primaryForeground} />
                    ) : (
                      <Copy size={18} color={colors.primaryForeground} />
                    )
                  }
                  onPress={copyCode}
                />
              </Card>
              <Text style={styles.hint}>
                Pague no app do seu banco em até 30 minutos. O saldo aparece aqui sozinho quando o pagamento for
                confirmado.
              </Text>
              {pix.payment.qr_code_base64 ? (
                <View style={styles.qr}>
                  <Image
                    source={{ uri: `data:image/png;base64,${pix.payment.qr_code_base64}` }}
                    style={styles.qrImage}
                    accessibilityLabel="QR Code PIX"
                  />
                </View>
              ) : null}
            </>
          ) : (
            <>
              <Field
                testID="deposit-amount"
                label="Valor da recarga (R$)"
                placeholder="50,00"
                keyboardType="decimal-pad"
                value={amountText}
                onChangeText={setAmountText}
              />
              <View style={styles.quick}>
                {QUICK_AMOUNTS.map((value) => (
                  <Pressable
                    key={value}
                    testID={`deposit-quick-${value / 100}`}
                    accessibilityRole="button"
                    onPress={() => setAmountText(String(value / 100))}
                    style={styles.chip}>
                    <Text style={styles.chipText}>{formatMoney(value)}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.hint}>
                Mínimo de {formatMoney(MIN_CENTS)} e máximo de {formatMoney(MAX_CENTS)} por recarga.
              </Text>
              {error && (
                <Text testID="deposit-error" style={styles.error}>
                  {error}
                </Text>
              )}
              <Button testID="deposit-submit" label="Gerar PIX" onPress={handleCreate} loading={creating} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.text40 },
  hint: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text50, textAlign: 'center' },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.destructive, textAlign: 'center' },
  quick: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text70 },
  summary: { alignItems: 'center', gap: 6 },
  amount: { fontFamily: fonts.headingBlack, fontSize: 32, color: colors.primary },
  codeCard: { padding: 16, gap: 12 },
  code: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.text70 },
  qr: { alignSelf: 'center', padding: 12, borderRadius: 14, backgroundColor: '#FFFFFF' },
  qrImage: { width: 180, height: 180 },
  state: { alignItems: 'center', gap: 12, paddingTop: 40 },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(74,222,128,0.1)',
  },
  stateTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  wide: { alignSelf: 'stretch', marginTop: 8 },
})
