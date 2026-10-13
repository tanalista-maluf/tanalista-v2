import { router, Stack, useLocalSearchParams } from 'expo-router'
import { CreditCard, QrCode, Tag, Wallet, X } from 'lucide-react-native'
import { useEffect, useState, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Card, Screen } from '@/components/ui'
import { fetchPaymentMethods, fetchWalletBalance, joinEvent, validateCoupon, type JoinMethod } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { useHeaderInset } from '@/lib/header'
import { supabase } from '@/lib/supabase'
import { colors, fonts, radius } from '@/lib/theme'

type CheckoutEvent = { title: string; price: number }

async function fetchCheckout(eventId: string) {
  const [{ data: event }, wallet, methods] = await Promise.all([
    supabase.from('events').select('title, price').eq('id', eventId).maybeSingle(),
    fetchWalletBalance(),
    fetchPaymentMethods(),
  ])
  return {
    event: event as CheckoutEvent | null,
    balance: 'balance' in wallet ? wallet.balance : 0,
    // O cartão só aparece quando o servidor está configurado para cobrar
    card: 'card' in methods && methods.card,
  }
}

// Inscrição em evento pago: cupom, meio de pagamento e total. O servidor refaz
// todas as contas na inscrição; o que aparece aqui é só a prévia.
export default function CheckoutScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>()
  const insets = useSafeAreaInsets()
  const headerInset = useHeaderInset()

  const [event, setEvent] = useState<CheckoutEvent | null | undefined>(undefined)
  const [balance, setBalance] = useState(0)
  const [cardEnabled, setCardEnabled] = useState(false)
  const [method, setMethod] = useState<JoinMethod>('PIX')
  const [code, setCode] = useState('')
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchCheckout(eventId).then((result) => {
      if (!active) return
      setEvent(result.event)
      setBalance(result.balance)
      setCardEnabled(result.card)
    })
    return () => {
      active = false
    }
  }, [eventId])

  async function applyCoupon() {
    const typed = code.trim().toUpperCase()
    if (!typed) return
    Keyboard.dismiss()
    setApplying(true)
    setCouponError(null)
    const result = await validateCoupon(eventId, typed)
    setApplying(false)
    if ('error' in result) setCouponError(result.error)
    else setCoupon({ code: typed, discount: result.discount_cents })
  }

  function removeCoupon() {
    setCoupon(null)
    setCode('')
    setCouponError(null)
  }

  async function handleSubmit(total: number) {
    setSubmitting(true)
    setError(null)
    // Com cupom de 100% não há o que cobrar: o servidor confirma pelo caminho da carteira
    const chosen = total === 0 ? 'WALLET' : method
    const result = await joinEvent(eventId, { method: chosen, couponCode: coupon?.code })
    setSubmitting(false)

    if ('error' in result) {
      setError(result.error)
      return
    }
    if (result.status === 'PENDING') {
      // replace: voltar do pagamento cai na página do evento, não aqui
      router.replace({
        pathname: chosen === 'CREDIT_CARD' ? '/card/[participationId]' : '/payment/[participationId]',
        params: { participationId: result.participationId },
      })
    } else {
      router.back()
    }
  }

  const header = <Stack.Screen options={{ title: 'Inscrição' }} />

  if (event === undefined) {
    return (
      <Screen>
        {header}
        <ActivityIndicator style={styles.centered} color={colors.primary} />
      </Screen>
    )
  }

  if (event === null) {
    return (
      <Screen>
        {header}
        <Text style={styles.notFound}>Evento não encontrado.</Text>
      </Screen>
    )
  }

  const total = Math.max(0, event.price - (coupon?.discount ?? 0))
  const free = total === 0
  const insufficient = balance < total
  const blocked = !free && method === 'WALLET' && insufficient

  return (
    <Screen>
      {header}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: 20 + headerInset }]}>
          <Text style={styles.title}>{event.title}</Text>

          <Card style={styles.section}>
            <Text style={styles.label}>Cupom de desconto</Text>
            {coupon ? (
              <View style={styles.applied}>
                <Tag size={16} color={colors.primary} />
                <Text testID="coupon-applied" style={styles.appliedText}>
                  {coupon.code} — desconto de {formatMoney(coupon.discount)}
                </Text>
                <Pressable testID="coupon-remove" onPress={removeCoupon} hitSlop={12} accessibilityLabel="Remover cupom">
                  <X size={18} color={colors.text50} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.couponRow}>
                <TextInput
                  testID="coupon-code"
                  value={code}
                  onChangeText={(text) => {
                    setCode(text.toUpperCase())
                    setCouponError(null)
                  }}
                  placeholder="Código"
                  placeholderTextColor={colors.text35}
                  selectionColor={colors.primary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={applyCoupon}
                  style={styles.couponInput}
                />
                <Pressable
                  testID="coupon-apply"
                  accessibilityRole="button"
                  onPress={applyCoupon}
                  disabled={applying || !code.trim()}
                  style={[styles.couponButton, (applying || !code.trim()) && styles.dim]}>
                  {applying ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Text style={styles.couponButtonText}>Aplicar</Text>
                  )}
                </Pressable>
              </View>
            )}
            {couponError && (
              <Text testID="coupon-error" style={styles.fieldError}>
                {couponError}
              </Text>
            )}
          </Card>

          {free ? (
            <Card style={styles.section}>
              <Text testID="checkout-free" style={styles.freeText}>
                O cupom cobre o valor inteiro: sua inscrição sai sem custo.
              </Text>
            </Card>
          ) : (
            <View style={styles.methods}>
              <Text style={styles.label}>Forma de pagamento</Text>
              <MethodOption
                testID="method-pix"
                selected={method === 'PIX'}
                onPress={() => setMethod('PIX')}
                icon={<QrCode size={20} color={method === 'PIX' ? colors.primary : colors.text50} />}
                title="PIX"
                detail="Copia e cola, confirmação em instantes"
              />
              {cardEnabled ? (
                <MethodOption
                  testID="method-card"
                  selected={method === 'CREDIT_CARD'}
                  onPress={() => setMethod('CREDIT_CARD')}
                  icon={<CreditCard size={20} color={method === 'CREDIT_CARD' ? colors.primary : colors.text50} />}
                  title="Cartão de crédito"
                  detail="À vista, confirmação na hora"
                />
              ) : null}
              <MethodOption
                testID="method-wallet"
                selected={method === 'WALLET'}
                onPress={() => setMethod('WALLET')}
                icon={<Wallet size={20} color={method === 'WALLET' ? colors.primary : colors.text50} />}
                title="Carteira TáNaLista"
                detail={`Saldo: ${formatMoney(balance)}${insufficient ? ' — insuficiente' : ''}`}
                warn={insufficient}
              />
            </View>
          )}

          <Card style={styles.totals}>
            <Row label="Inscrição" value={formatMoney(event.price)} />
            {coupon ? <Row label="Desconto" value={`- ${formatMoney(coupon.discount)}`} /> : null}
            <View style={styles.divider} />
            <Row label="Total" value={formatMoney(total)} strong testID="checkout-total" />
          </Card>

          {error && (
            <Text testID="checkout-error" style={styles.error}>
              {error}
            </Text>
          )}
        </ScrollView>

        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button
            testID="checkout-submit"
            label={
              free || method === 'WALLET'
                ? 'Confirmar inscrição'
                : method === 'CREDIT_CARD'
                  ? 'Pagar com cartão'
                  : 'Pagar com PIX'
            }
            onPress={() => handleSubmit(total)}
            loading={submitting}
            disabled={blocked}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

function MethodOption(props: {
  testID: string
  selected: boolean
  onPress: () => void
  icon: ReactNode
  title: string
  detail: string
  warn?: boolean
}) {
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="radio"
      accessibilityState={{ selected: props.selected }}
      accessibilityLabel={`${props.title}. ${props.detail}`}
      onPress={props.onPress}
      style={[styles.method, props.selected && styles.methodSelected]}>
      {props.icon}
      <View style={styles.methodBody}>
        <Text style={styles.methodTitle}>{props.title}</Text>
        <Text style={[styles.methodDetail, props.warn && styles.methodWarn]}>{props.detail}</Text>
      </View>
      <View style={[styles.radio, props.selected && styles.radioSelected]}>
        {props.selected && <View style={styles.radioDot} />}
      </View>
    </Pressable>
  )
}

function Row({ label, value, strong, testID }: { label: string; value: string; strong?: boolean; testID?: string }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.rowStrong]}>{label}</Text>
      <Text testID={testID} style={[styles.rowValue, strong && styles.rowTotal]}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1 },
  notFound: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center', marginTop: 140, fontSize: 15 },
  content: { padding: 16, gap: 14, paddingBottom: 24 },
  title: { fontFamily: fonts.headingBlack, fontSize: 22, lineHeight: 28, color: colors.text, letterSpacing: -0.4 },
  section: { padding: 16, gap: 12 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.text40 },
  couponRow: { flexDirection: 'row', gap: 10 },
  couponInput: {
    flex: 1,
    height: 48,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    letterSpacing: 1,
    color: colors.foreground,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
  },
  couponButton: {
    minWidth: 96,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.3)',
    backgroundColor: 'rgba(74,222,128,0.08)',
    paddingHorizontal: 18,
  },
  couponButtonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },
  dim: { opacity: 0.5 },
  applied: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appliedText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.primary },
  fieldError: { fontFamily: fonts.body, fontSize: 13, color: colors.destructive },
  freeText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.foreground },
  methods: { gap: 10 },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  methodSelected: { borderColor: 'rgba(74,222,128,0.45)', backgroundColor: 'rgba(74,222,128,0.06)' },
  methodBody: { flex: 1, gap: 2 },
  methodTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  methodDetail: { fontFamily: fonts.body, fontSize: 13, color: colors.text50 },
  methodWarn: { color: colors.warning },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.text25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  totals: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rowLabel: { fontFamily: fonts.body, fontSize: 15, color: colors.text50 },
  rowStrong: { fontFamily: fonts.bodyBold, color: colors.text },
  rowValue: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text70 },
  rowTotal: { fontFamily: fonts.headingBlack, fontSize: 22, color: colors.primary },
  divider: { height: 1, backgroundColor: colors.cardBorder },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.destructive, textAlign: 'center' },
  bar: {
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
})
