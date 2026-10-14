import { router, useFocusEffect } from 'expo-router'
import { ArrowDownLeft, ArrowUpRight, Gift, RefreshCw, Ticket, Wallet } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Keyboard, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Button, Card, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { fetchWalletBalance, redeemCreditCoupon } from '@/lib/api'
import { formatLongDate, formatMoney } from '@/lib/format'
import { useTabHeaderInset } from '@/lib/header'
import { supabase } from '@/lib/supabase'
import { colors, fonts, radius } from '@/lib/theme'

type Transaction = {
  id: string
  type: string
  amount: number
  balance_after: number
  description: string | null
  created_at: string
}

// Mesmos rótulos do site (src/features/carteira/components/TransactionList.tsx)
const TYPES: Record<string, { label: string; credit: boolean; icon: typeof ArrowDownLeft }> = {
  DEPOSIT: { label: 'Recarga', credit: true, icon: ArrowDownLeft },
  PAYMENT: { label: 'Pagamento', credit: false, icon: ArrowUpRight },
  REFUND: { label: 'Estorno', credit: true, icon: RefreshCw },
  WITHDRAWAL: { label: 'Saque', credit: false, icon: ArrowUpRight },
  PAYOUT: { label: 'Repasse', credit: true, icon: ArrowDownLeft },
  BONUS: { label: 'Crédito', credit: true, icon: Gift },
  ADJUSTMENT: { label: 'Ajuste', credit: false, icon: RefreshCw },
}

async function fetchWallet(userId: string) {
  const [balance, { data }] = await Promise.all([
    fetchWalletBalance(),
    supabase
      .from('wallet_transactions')
      .select('id, type, amount, balance_after, description, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])
  return {
    balance: 'balance' in balance ? balance.balance : null,
    // Recarga ainda não paga é só um registro de controle: não é movimentação
    transactions: (data ?? []).filter((tx) => !tx.description?.includes('aguardando pagamento')) as Transaction[],
  }
}

export default function WalletScreen() {
  const { session } = useSession()
  const userId = session!.user.id
  const headerInset = useTabHeaderInset()
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchWallet>> | undefined>(undefined)
  const [refreshing, setRefreshing] = useState(false)
  const [couponOpen, setCouponOpen] = useState(false)
  const [code, setCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  // Recarrega também ao voltar da recarga ou do saque
  useFocusEffect(
    useCallback(() => {
      let active = true
      fetchWallet(userId).then((result) => {
        if (active) setData(result)
      })
      return () => {
        active = false
      }
    }, [userId])
  )

  async function reload() {
    setData(await fetchWallet(userId))
  }

  async function handleRefresh() {
    setRefreshing(true)
    await reload()
    setRefreshing(false)
  }

  async function handleRedeem() {
    if (!code.trim()) return
    Keyboard.dismiss()
    setRedeeming(true)
    setNotice(null)
    const result = await redeemCreditCoupon(code)
    if ('error' in result) {
      setNotice({ ok: false, text: result.error })
    } else {
      setNotice({ ok: true, text: `Cupom aplicado: ${formatMoney(result.amount_cents)} na sua carteira.` })
      setCode('')
      setCouponOpen(false)
      await reload()
    }
    setRedeeming(false)
  }

  return (
    <Screen>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: 20 + headerInset }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            progressViewOffset={headerInset}
          />
        }>
        <Card style={styles.balance}>
          <Text style={styles.label}>Saldo disponível</Text>
          {data === undefined ? (
            <ActivityIndicator color={colors.primary} style={styles.balanceLoading} />
          ) : (
            <Text testID="wallet-balance" style={styles.balanceValue}>
              {data.balance === null ? '—' : formatMoney(data.balance)}
            </Text>
          )}
          <Text style={styles.hint}>Disponível para uso em eventos</Text>
          <View style={styles.actions}>
            <Button
              testID="wallet-deposit"
              label="Adicionar"
              onPress={() => router.push('/wallet/deposit')}
              style={styles.action}
            />
            <Pressable
              testID="wallet-withdraw"
              accessibilityRole="button"
              onPress={() => router.push('/wallet/withdraw')}
              style={({ pressed }) => [styles.secondary, pressed && styles.dim]}>
              <Text style={styles.secondaryText}>Sacar</Text>
            </Pressable>
          </View>
        </Card>

        {couponOpen ? (
          <Card style={styles.coupon}>
            <Text style={styles.label}>Cupom de crédito</Text>
            <View style={styles.couponRow}>
              <TextInput
                testID="wallet-coupon-code"
                value={code}
                onChangeText={(text) => setCode(text.toUpperCase())}
                placeholder="Código"
                placeholderTextColor={colors.text35}
                selectionColor={colors.primary}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleRedeem}
                style={styles.couponInput}
              />
              <Pressable
                testID="wallet-coupon-apply"
                accessibilityRole="button"
                onPress={handleRedeem}
                disabled={redeeming || !code.trim()}
                style={[styles.couponButton, (redeeming || !code.trim()) && styles.dim]}>
                {redeeming ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={styles.couponButtonText}>Resgatar</Text>
                )}
              </Pressable>
            </View>
          </Card>
        ) : (
          <Pressable
            testID="wallet-coupon"
            accessibilityRole="button"
            onPress={() => setCouponOpen(true)}
            style={({ pressed }) => [styles.couponLink, pressed && styles.dim]}>
            <Ticket size={17} color={colors.primary} />
            <Text style={styles.couponLinkText}>Tenho um cupom</Text>
          </Pressable>
        )}
        {notice && (
          <Text testID="wallet-notice" style={[styles.notice, !notice.ok && styles.error]}>
            {notice.text}
          </Text>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Histórico</Text>
          {data && data.transactions.length === 0 ? (
            <View style={styles.empty}>
              <Wallet size={32} color={colors.text25} />
              <Text testID="wallet-empty" style={styles.emptyText}>
                Nenhuma movimentação ainda.
              </Text>
            </View>
          ) : (
            <Card style={styles.list}>
              {(data?.transactions ?? []).map((tx, index) => {
                const type = TYPES[tx.type] ?? TYPES.PAYMENT
                const Icon = type.icon
                // Recarga que veio da receita de um evento é um resgate
                const label = tx.type === 'DEPOSIT' && tx.description?.toLowerCase().includes('receita') ? 'Resgate' : type.label
                const amount = formatMoney(Math.abs(tx.amount))
                return (
                  <View key={tx.id} testID={`wallet-tx-${index}`} style={[styles.tx, index > 0 && styles.divider]}>
                    <View style={[styles.txIcon, type.credit ? styles.txIconCredit : styles.txIconDebit]}>
                      <Icon size={16} color={type.credit ? colors.primary : colors.text70} />
                    </View>
                    <View style={styles.txBody}>
                      <Text style={styles.txLabel}>{label}</Text>
                      {tx.description ? <Text style={styles.txDescription}>{tx.description}</Text> : null}
                      <Text style={styles.txDate}>{formatLongDate(tx.created_at)}</Text>
                    </View>
                    <View style={styles.txValues}>
                      <Text style={[styles.txAmount, type.credit && styles.txCredit]}>
                        {type.credit ? '+ ' : '− '}
                        {amount}
                      </Text>
                      <Text style={styles.txDate}>Saldo: {formatMoney(tx.balance_after)}</Text>
                    </View>
                  </View>
                )
              })}
            </Card>
          )}
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.text40 },
  balance: { padding: 18, gap: 6 },
  balanceLoading: { alignSelf: 'flex-start', marginVertical: 10 },
  balanceValue: { fontFamily: fonts.headingBlack, fontSize: 32, color: colors.primary },
  hint: { fontFamily: fonts.body, fontSize: 13, color: colors.text50 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  action: { flex: 1 },
  secondary: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  secondaryText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.foreground },
  dim: { opacity: 0.5 },
  couponLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44 },
  couponLinkText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.primary },
  coupon: { padding: 16, gap: 12 },
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
    minWidth: 104,
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
  notice: { fontFamily: fonts.body, fontSize: 14, color: colors.primary, textAlign: 'center' },
  error: { color: colors.destructive },
  section: { gap: 10 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  list: { paddingHorizontal: 14 },
  tx: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  txIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  txIconCredit: { backgroundColor: 'rgba(74,222,128,0.1)' },
  txIconDebit: { backgroundColor: 'rgba(255,255,255,0.06)' },
  txBody: { flex: 1, gap: 2 },
  txLabel: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  txDescription: { fontFamily: fonts.body, fontSize: 13, color: colors.text70 },
  txDate: { fontFamily: fonts.body, fontSize: 12, color: colors.text40 },
  txValues: { alignItems: 'flex-end', gap: 2 },
  txAmount: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  txCredit: { color: colors.primary },
})
