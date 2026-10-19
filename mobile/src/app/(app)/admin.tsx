import * as Clipboard from 'expo-clipboard'
import { router, Stack } from 'expo-router'
import { Search, Trash2 } from 'lucide-react-native'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { Badge, Button, Card, Screen } from '@/components/ui'
import { runAction } from '@/lib/api'
import { formatLongDate, formatMoney } from '@/lib/format'
import { STATUS_LABELS } from '@/lib/finance'
import { useHeaderInset } from '@/lib/header'
import { colors, fonts, radius } from '@/lib/theme'

type Section = 'dashboard' | 'withdrawals' | 'users' | 'events' | 'groups' | 'coupons'

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'dashboard', label: 'Painel' },
  { key: 'withdrawals', label: 'Saques' },
  { key: 'users', label: 'Usuários' },
  { key: 'events', label: 'Eventos' },
  { key: 'groups', label: 'Grupos' },
  { key: 'coupons', label: 'Cupons' },
]

// Nome da consulta na ponte /api/v1/actions para cada seção
const LOADERS: Record<Section, string> = {
  dashboard: 'adminDashboard',
  withdrawals: 'adminWithdrawals',
  users: 'adminUsers',
  events: 'adminEvents',
  groups: 'adminGroups',
  coupons: 'adminCoupons',
}

type Data = Record<string, any>

// Painel de admin, com as mesmas seções do site (/admin). Só aparece para quem
// está na lista ADMIN_EMAILS do servidor, que confere de novo a cada chamada.
export default function AdminScreen() {
  const headerInset = useHeaderInset()
  const [section, setSection] = useState<Section>('dashboard')
  const [data, setData] = useState<Data | null | undefined>(undefined)
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [coupon, setCoupon] = useState({ code: '', value: '', maxUses: '' })

  const load = useCallback(
    async (which: Section, q: string) => {
      const result = await runAction<Data>(LOADERS[which], q || undefined)
      setData('ok' in result ? result.ok : null)
      if ('error' in result) setMessage({ ok: false, text: result.error })
    },
    []
  )

  useEffect(() => {
    let active = true
    runAction<Data>(LOADERS[section]).then((result) => {
      if (!active) return
      setData('ok' in result ? result.ok : null)
      if ('error' in result) setMessage({ ok: false, text: result.error })
    })
    return () => {
      active = false
    }
  }, [section])

  async function act(name: string, args: unknown[], success: string) {
    setMessage(null)
    const result = await runAction(name, ...args)
    setMessage('error' in result ? { ok: false, text: result.error } : { ok: true, text: success })
    await load(section, query)
    return !('error' in result)
  }

  function withdrawalAction(id: string, confirm: boolean) {
    Alert.alert(
      confirm ? 'Marcar como pago?' : 'Cancelar o saque?',
      confirm ? 'Confirme só depois de fazer o PIX.' : 'O valor volta para a carteira da pessoa.',
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: confirm ? 'Marcar como pago' : 'Cancelar saque',
          style: confirm ? 'default' : 'destructive',
          onPress: () =>
            act(confirm ? 'adminConfirmWithdrawal' : 'adminCancelWithdrawal', [id], confirm ? 'Saque marcado como pago.' : 'Saque cancelado.'),
        },
      ]
    )
  }

  function purgeCancelled() {
    Alert.alert(
      'Limpar eventos cancelados?',
      'Apaga de vez os cancelados que nunca tiveram inscrição. Os que tiveram ficam, porque guardam pagamentos e estornos.',
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            setMessage(null)
            const result = await runAction<{ removed: number; kept: number }>('adminPurgeCancelledEvents')
            if ('error' in result) setMessage({ ok: false, text: result.error })
            else if ('ok' in result) {
              const { removed, kept } = result.ok
              setMessage({
                ok: true,
                text:
                  `${removed} ${removed === 1 ? 'evento removido' : 'eventos removidos'}.` +
                  (kept > 0 ? ` ${kept} ${kept === 1 ? 'ficou' : 'ficaram'} por ter inscrições.` : ''),
              })
            }
            await load(section, query)
          },
        },
      ]
    )
  }

  async function createCoupon() {
    const cents = Math.round(Number(coupon.value.replace(',', '.')) * 100)
    const maxUses = coupon.maxUses ? Number(coupon.maxUses) : null
    if (coupon.code.trim().length < 3) return setMessage({ ok: false, text: 'O código precisa de ao menos 3 letras.' })
    if (!(cents >= 100)) return setMessage({ ok: false, text: 'Valor mínimo: R$ 1,00.' })
    const ok = await act(
      'adminCreateCoupon',
      [{ code: coupon.code.trim(), amount_cents: cents, max_uses: maxUses, expires_at: null }],
      'Cupom criado.'
    )
    if (ok) setCoupon({ code: '', value: '', maxUses: '' })
  }

  const searchable = section === 'users' || section === 'events'

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Admin' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: 16 + headerInset }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              await load(section, query)
              setRefreshing(false)
            }}
            tintColor={colors.primary}
            progressViewOffset={headerInset}
          />
        }>
        <View style={styles.chips}>
          {SECTIONS.map((item) => (
            <Pressable
              key={item.key}
              testID={`admin-${item.key}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: item.key === section }}
              onPress={() => {
                if (item.key === section) return
                setQuery('')
                setData(undefined)
                setMessage(null)
                setSection(item.key)
              }}
              style={[styles.chip, item.key === section && styles.chipSelected]}>
              <Text style={[styles.chipText, item.key === section && styles.chipTextSelected]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {searchable && (
          <View style={styles.search}>
            <Search size={16} color={colors.text35} />
            <TextInput
              testID="admin-search"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => load(section, query)}
              placeholder={section === 'users' ? 'Nome, @username ou telefone' : 'Título do evento'}
              placeholderTextColor={colors.text35}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              style={styles.searchInput}
            />
          </View>
        )}

        {message && <Text style={[styles.notice, !message.ok && styles.error]}>{message.text}</Text>}

        {data === undefined ? (
          <ActivityIndicator style={styles.loading} color={colors.primary} />
        ) : data === null ? null : section === 'dashboard' ? (
          <>
            <View style={styles.stats}>
              <Stat testID="admin-users-count" value={String(data.totalUsers)} label={`Usuários · +${data.newUsers} no mês`} />
              <Stat value={String(data.totalEvents)} label={`Eventos · ${data.openEvents} ativos`} />
              <Stat value={String(data.totalGroups)} label="Grupos" />
              <Stat value={String(data.totalParticipations)} label="Inscrições confirmadas" />
            </View>
            <Card style={styles.block}>
              <Text style={styles.label}>Receita bruta (30 dias)</Text>
              <Text style={styles.money}>{formatMoney(data.grossRevenue)}</Text>
              <Text style={styles.label}>Receita da plataforma (30 dias)</Text>
              <Text style={[styles.money, styles.warning]}>{formatMoney(data.platformRevenue)}</Text>
            </Card>
            <Block title="Eventos recentes">
              {data.recentEvents.map((event: Data) => (
                <Row key={event.id} title={event.title} detail={`@${event.profiles?.username ?? '—'}`}>
                  <Badge label={STATUS_LABELS[event.status] ?? event.status} tone="muted" />
                </Row>
              ))}
            </Block>
            <Block title="Usuários recentes">
              {data.recentUsers.map((user: Data) => (
                <Row key={user.id} title={user.full_name ?? '—'} detail={`@${user.username ?? '—'}`}>
                  <Text style={styles.detail}>{user.city ?? ''}</Text>
                </Row>
              ))}
            </Block>
          </>
        ) : section === 'withdrawals' ? (
          <Block title={`Saques (${(data as Data[]).filter((w) => w.status === 'PENDING').length} pendentes)`}>
            {(data as Data[]).length === 0 && <Text style={styles.detail}>Nenhum saque.</Text>}
            {(data as Data[]).map((withdrawal, index) => (
              <View key={withdrawal.id} style={styles.withdrawal}>
                <Row
                  title={withdrawal.profile?.full_name ?? '—'}
                  detail={`${formatMoney(withdrawal.net_cents)} · ${withdrawal.pix_key_type.toUpperCase()}: ${withdrawal.pix_key} · CPF ${withdrawal.cpf}`}>
                  <Badge
                    label={withdrawal.status === 'PENDING' ? 'Pendente' : withdrawal.status === 'COMPLETED' ? 'Pago' : 'Cancelado'}
                    tone={withdrawal.status === 'PENDING' ? 'warning' : 'muted'}
                  />
                </Row>
                <Text style={styles.detail}>{formatLongDate(withdrawal.created_at)}</Text>
                {withdrawal.status === 'PENDING' && (
                  <View style={styles.actions}>
                    <Pressable testID={`withdrawal-cancel-${index}`} onPress={() => withdrawalAction(withdrawal.id, false)}>
                      <Text style={styles.danger}>Cancelar</Text>
                    </Pressable>
                    <Pressable testID={`withdrawal-paid-${index}`} onPress={() => withdrawalAction(withdrawal.id, true)}>
                      <Text style={styles.link}>Marcar como pago</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </Block>
        ) : section === 'users' ? (
          <Block title={`Usuários (${data.total})`}>
            {data.users.map((user: Data) => (
              <View key={user.id}>
                <Row
                  title={user.full_name ?? '—'}
                  detail={`@${user.username ?? '—'} · ${user.city ?? 'sem cidade'} · ${formatMoney(user.wallet_balance ?? 0)}`}
                  onPress={() => user.username && router.push({ pathname: '/users/[username]', params: { username: user.username } })}>
                  {!user.onboarding_completed && <Badge label="Sem perfil" tone="warning" />}
                </Row>
                {/* Contatos (só o admin recebe): tocar abre o e-mail ou o discador; segurar copia */}
                <View style={styles.contacts}>
                  <Contact value={user.email} empty="sem e-mail" url={user.email ? `mailto:${user.email}` : null} />
                  <Contact value={user.phone} empty="sem telefone" url={user.phone ? `tel:${String(user.phone).replace(/[^\d+]/g, '')}` : null} />
                </View>
              </View>
            ))}
          </Block>
        ) : section === 'events' ? (
          <Block title={`Eventos (${data.total})`}>
            <Pressable
              testID="admin-purge-cancelled"
              accessibilityRole="button"
              onPress={purgeCancelled}
              style={({ pressed }) => [styles.purge, pressed && styles.dim]}>
              <Trash2 size={16} color={colors.destructive} />
              <Text style={styles.purgeText}>Limpar eventos cancelados</Text>
            </Pressable>
            {data.events.map((event: Data) => (
              <Row
                key={event.id}
                title={event.title}
                detail={`@${event.profiles?.username ?? '—'} · ${event.confirmed_count}/${event.capacity} · ${formatMoney(event.price)}`}
                onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}>
                <Badge label={STATUS_LABELS[event.status] ?? event.status} tone="muted" />
              </Row>
            ))}
          </Block>
        ) : section === 'groups' ? (
          <Block title={`Grupos (${data.total})`}>
            {data.groups.map((group: Data) => (
              <Row
                key={group.id}
                title={group.name}
                detail={`@${group.profiles?.username ?? '—'} · ${group.member_count} membros · ${group.city ?? ''}`}>
                <Badge label={group.visibility === 'PRIVATE' ? 'Privado' : 'Público'} tone="muted" />
              </Row>
            ))}
          </Block>
        ) : (
          <>
            <Block title="Novo cupom de crédito">
              <View style={styles.inputs}>
                <TextInput
                  testID="admin-coupon-code"
                  value={coupon.code}
                  onChangeText={(code) => setCoupon((current) => ({ ...current, code: code.toUpperCase() }))}
                  placeholder="CÓDIGO"
                  placeholderTextColor={colors.text35}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={[styles.input, styles.flex]}
                />
                <TextInput
                  testID="admin-coupon-value"
                  value={coupon.value}
                  onChangeText={(value) => setCoupon((current) => ({ ...current, value }))}
                  placeholder="R$"
                  placeholderTextColor={colors.text35}
                  keyboardType="decimal-pad"
                  style={[styles.input, styles.short]}
                />
                <TextInput
                  testID="admin-coupon-uses"
                  value={coupon.maxUses}
                  onChangeText={(maxUses) => setCoupon((current) => ({ ...current, maxUses }))}
                  placeholder="usos"
                  placeholderTextColor={colors.text35}
                  keyboardType="number-pad"
                  style={[styles.input, styles.short]}
                />
              </View>
              <Button testID="admin-coupon-create" label="Criar cupom" onPress={createCoupon} />
            </Block>
            <Block title="Cupons">
              {(data as Data[]).map((item) => (
                <Row
                  key={item.id}
                  title={item.code}
                  detail={`${formatMoney(item.amount_cents)} · ${item.uses_count}/${item.max_uses ?? '∞'} usos`}>
                  <Switch
                    value={item.active}
                    onValueChange={(value) => {
                      act('adminToggleCoupon', [item.id, value], value ? 'Cupom ativado.' : 'Cupom desativado.')
                    }}
                    trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.15)' }}
                    thumbColor="#FFFFFF"
                  />
                </Row>
              ))}
            </Block>
          </>
        )}
      </ScrollView>
    </Screen>
  )
}

function Stat({ value, label, testID }: { value: string; label: string; testID?: string }) {
  return (
    <Card style={styles.stat}>
      <Text testID={testID} style={styles.statValue}>
        {value}
      </Text>
      <Text style={styles.detail}>{label}</Text>
    </Card>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card style={styles.block}>
      <Text style={styles.label}>{title}</Text>
      {children}
    </Card>
  )
}

function Contact({ value, empty, url }: { value?: string | null; empty: string; url: string | null }) {
  if (!value || !url) return <Text style={styles.contactEmpty}>{empty}</Text>
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => Linking.openURL(url).catch(() => {})}
      onLongPress={async () => {
        await Clipboard.setStringAsync(value)
        Alert.alert('Copiado', value)
      }}>
      <Text style={styles.contact} selectable>
        {value}
      </Text>
    </Pressable>
  )
}

function Row(props: { title: string; detail?: string; onPress?: () => void; children?: ReactNode }) {
  return (
    <Pressable disabled={!props.onPress} onPress={props.onPress} style={styles.row}>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{props.title}</Text>
        {props.detail ? <Text style={styles.detail}>{props.detail}</Text> : null}
      </View>
      {props.children}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  purge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  dim: { opacity: 0.6 },
  purgeText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.destructive },
  flex: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  loading: { marginTop: 48 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  chipSelected: { borderColor: 'rgba(74,222,128,0.45)', backgroundColor: 'rgba(74,222,128,0.1)' },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text70 },
  chipTextSelected: { color: colors.primary },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 46,
    paddingHorizontal: 16,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  searchInput: { flex: 1, height: 46, fontFamily: fonts.body, fontSize: 15, color: colors.foreground },
  notice: { fontFamily: fonts.body, fontSize: 14, color: colors.primary, textAlign: 'center' },
  error: { color: colors.destructive },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { flexBasis: '47%', flexGrow: 1, padding: 14, gap: 2 },
  statValue: { fontFamily: fonts.headingBlack, fontSize: 22, color: colors.text },
  block: { padding: 16, gap: 10 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.text40 },
  money: { fontFamily: fonts.headingBlack, fontSize: 24, color: colors.primary },
  warning: { color: colors.warning },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  detail: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.text50 },
  contacts: { gap: 2, paddingBottom: 6 },
  contact: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.primary },
  contactEmpty: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.text25 },
  withdrawal: { gap: 4, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 4 },
  link: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },
  danger: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.destructive },
  inputs: { flexDirection: 'row', gap: 8 },
  input: {
    minHeight: 46,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.foreground,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  short: { width: 74 },
})
