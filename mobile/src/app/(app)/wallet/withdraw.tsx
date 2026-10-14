import { router, Stack } from 'expo-router'
import { CheckCheck } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button, Card, Field, Screen } from '@/components/ui'
import { fetchWalletBalance, requestWithdrawal } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { useHeaderInset } from '@/lib/header'
import { parseMoney } from '@/lib/money'
import { colors, fonts, radius } from '@/lib/theme'

type KeyType = 'cpf' | 'email' | 'phone' | 'random'

const KEY_TYPES: { value: KeyType; label: string; placeholder: string }[] = [
  { value: 'cpf', label: 'CPF', placeholder: 'Só os números' },
  { value: 'email', label: 'E-mail', placeholder: 'seu@email.com' },
  { value: 'phone', label: 'Celular', placeholder: '+5511999999999' },
  { value: 'random', label: 'Aleatória', placeholder: 'Chave aleatória' },
]

// Mesmos limites do servidor (src/features/carteira/wallet.ts)
const MIN_CENTS = 500
const MAX_CENTS = 500000

// Saque por PIX: o saldo sai na hora e a equipe faz a transferência
export default function WithdrawScreen() {
  const headerInset = useHeaderInset()
  const [balance, setBalance] = useState<number | null>(null)
  const [amountText, setAmountText] = useState('')
  const [cpf, setCpf] = useState('')
  const [keyType, setKeyType] = useState<KeyType>('cpf')
  const [pixKey, setPixKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState<number | null>(null)

  useEffect(() => {
    fetchWalletBalance().then((result) => 'balance' in result && setBalance(result.balance))
  }, [])

  async function handleSubmit() {
    const amount = parseMoney(amountText)
    const digits = cpf.replace(/\D/g, '')
    if (!amount || amount < MIN_CENTS) return setError(`Valor mínimo: ${formatMoney(MIN_CENTS)}.`)
    if (amount > MAX_CENTS) return setError(`Valor máximo: ${formatMoney(MAX_CENTS)}.`)
    if (balance !== null && amount > balance) return setError('Saldo insuficiente.')
    if (digits.length !== 11) return setError('CPF inválido: informe os 11 dígitos.')
    if (!pixKey.trim()) return setError('Informe a chave PIX.')

    setSaving(true)
    setError(null)
    const result = await requestWithdrawal({
      amount_cents: amount,
      cpf: digits,
      pix_key: keyType === 'cpf' ? pixKey.replace(/\D/g, '') : pixKey.trim(),
      pix_key_type: keyType,
    })
    setSaving(false)
    if ('error' in result) setError(result.error)
    else setDone(amount)
  }

  const current = KEY_TYPES.find((item) => item.value === keyType)!

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Sacar' }} />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: 20 + headerInset }]}>
          {done !== null ? (
            <View testID="withdraw-done" style={styles.state}>
              <View style={styles.stateIcon}>
                <CheckCheck size={32} color={colors.primary} />
              </View>
              <Text style={styles.stateTitle}>Saque solicitado</Text>
              <Text style={styles.hint}>
                {formatMoney(done)} saíram da sua carteira. A transferência por PIX é feita pela nossa equipe, em geral
                no mesmo dia útil.
              </Text>
              <Button testID="withdraw-back" label="Voltar à carteira" onPress={() => router.back()} style={styles.wide} />
            </View>
          ) : (
            <>
              <Card style={styles.balance}>
                <Text style={styles.label}>Disponível para saque</Text>
                <Text testID="withdraw-balance" style={styles.balanceValue}>
                  {balance === null ? '—' : formatMoney(balance)}
                </Text>
              </Card>
              <Field
                testID="withdraw-amount"
                label="Valor (R$)"
                placeholder="0,00"
                keyboardType="decimal-pad"
                value={amountText}
                onChangeText={setAmountText}
              />
              <Field
                testID="withdraw-cpf"
                label="CPF do titular"
                placeholder="Só os números"
                keyboardType="number-pad"
                value={cpf}
                onChangeText={setCpf}
                maxLength={14}
              />
              <View style={styles.block}>
                <Text style={styles.label}>Tipo de chave PIX</Text>
                <View style={styles.types}>
                  {KEY_TYPES.map((item) => {
                    const selected = item.value === keyType
                    return (
                      <Pressable
                        key={item.value}
                        testID={`withdraw-type-${item.value}`}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => setKeyType(item.value)}
                        style={[styles.chip, selected && styles.chipSelected]}>
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item.label}</Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>
              <Field
                testID="withdraw-key"
                label="Chave PIX"
                placeholder={current.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={keyType === 'email' ? 'email-address' : keyType === 'cpf' ? 'number-pad' : 'default'}
                value={pixKey}
                onChangeText={setPixKey}
              />
              <Text style={styles.hint}>Sem taxa de saque. Mínimo de {formatMoney(MIN_CENTS)}.</Text>
              {error && (
                <Text testID="withdraw-error" style={styles.error}>
                  {error}
                </Text>
              )}
              <Button testID="withdraw-submit" label="Solicitar saque" onPress={handleSubmit} loading={saving} />
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
  balance: { padding: 16, gap: 4 },
  balanceValue: { fontFamily: fonts.headingBlack, fontSize: 26, color: colors.primary },
  block: { gap: 10 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  chipSelected: { borderColor: 'rgba(74,222,128,0.45)', backgroundColor: 'rgba(74,222,128,0.1)' },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text70 },
  chipTextSelected: { fontFamily: fonts.bodyBold, color: colors.primary },
  hint: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text50, textAlign: 'center' },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.destructive, textAlign: 'center' },
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
