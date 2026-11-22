import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { CheckCircle2, Copy, FileDown, ImagePlus, Link2, Pencil, QrCode, Send, Wallet, XCircle } from 'lucide-react-native'
import { useCallback, useState, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Avatar } from '@/components/avatar'
import { CancelEventDialog } from '@/components/cancel-event-dialog'
import { OrganizerChecklist } from '@/components/organizer-checklist'
import { Badge, Button, Card, Screen } from '@/components/ui'
import { runAction, type Person } from '@/lib/api'
import { formatPrice } from '@/lib/format'
import { useHeaderInset } from '@/lib/header'
import { shareLink } from '@/lib/share'
import { supabase } from '@/lib/supabase'
import { colors, fonts, radius } from '@/lib/theme'

type OrganizerData = {
  participants: {
    id: string
    status: string
    checkedInAt: string | null
    teamId?: string | null
    profile: Person
    payment: { method: string; amount: number } | null
  }[]
  joinRequests: { id: string; created_at: string; profile: Person }[]
  waitlist: { id: string; position: number; status: string; profile: Person }[]
  // Ausente numa versão anterior do servidor
  teams?: { id: string; name: string; capacity: number }[]
  inviteToken: string | null
}

type Coupon = {
  id: string
  code: string
  max_uses: number | null
  uses_count: number
  active: boolean
  percent_off: number | null
  group_id: string | null
}

type ManagedEvent = {
  id: string
  slug: string | null
  title: string
  status: string
  price: number
  capacity: number
  confirmed_count: number
  custom_rules: string | null
  cover_url: string | null
  visibility: string
  group_id: string | null
  starts_at: string
  description: string | null
  ends_at: string | null
  cancel_before_hours: number | null
}

const METHODS: Record<string, string> = { PIX: 'PIX', CREDIT_CARD: 'Cartão', WALLET: 'Carteira' }

function personName(profile: Person) {
  return profile?.full_name ?? (profile?.username ? `@${profile.username}` : 'Alguém')
}

async function fetchAll(eventId: string) {
  const [{ data: event }, organizer, coupons] = await Promise.all([
    supabase
      .from('events')
      .select('id, slug, title, status, price, capacity, confirmed_count, custom_rules, cover_url, visibility, group_id, starts_at, description, ends_at, cancel_before_hours')
      .eq('id', eventId)
      .maybeSingle(),
    runAction<OrganizerData>('organizerEvent', eventId),
    runAction<{ coupons: Coupon[] }>('listEventCoupons', eventId),
  ])
  return {
    event: event as ManagedEvent | null,
    organizer: 'ok' in organizer ? organizer.ok : null,
    error: 'error' in organizer ? organizer.error : null,
    coupons: 'ok' in coupons ? coupons.ok.coupons : [],
  }
}

// Painel do organizador para um evento: inscritos e check-in, pedidos de
// entrada, fila, cupons, convite, regras, capa, mensagem e as ações do evento
export default function ManageEventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>()
  const headerInset = useHeaderInset()
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAll>> | undefined>(undefined)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [rules, setRules] = useState<string | null>(null)
  const [broadcast, setBroadcast] = useState('')
  const [coupon, setCoupon] = useState({ code: '', percent: '', maxUses: '', groupWide: false })
  const [cancelOpen, setCancelOpen] = useState(false)

  const load = useCallback(async () => {
    const result = await fetchAll(eventId)
    setData(result)
    setRules((current) => current ?? result.event?.custom_rules ?? '')
  }, [eventId])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  // Roda uma ação, mostra o resultado e relê o painel
  async function act(key: string, name: string, args: unknown[], success?: string) {
    setBusy(key)
    setMessage(null)
    const result = await runAction(name, ...args)
    if ('error' in result) setMessage({ ok: false, text: result.error })
    else if (success) setMessage({ ok: true, text: success })
    await load()
    setBusy(null)
    return !('error' in result)
  }

  if (data === undefined) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Gerenciar evento' }} />
        <ActivityIndicator style={styles.flex} color={colors.primary} />
      </Screen>
    )
  }

  const { event, organizer, coupons } = data
  if (!event || !organizer) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Gerenciar evento' }} />
        <Text style={styles.failed}>{data.error ?? 'Evento não encontrado.'}</Text>
      </Screen>
    )
  }

  const confirmed = organizer.participants.filter((p) => p.status === 'CONFIRMED')
  const checkedIn = confirmed.filter((p) => p.checkedInAt).length
  const active = !['CANCELLED', 'COMPLETED'].includes(event.status)

  const teams = organizer.teams ?? []

  // Uma linha de inscrito; index é a posição na lista toda (testIDs estáveis)
  function renderParticipant(participant: OrganizerData['participants'][number], index: number, divider: boolean) {
    return (
      <View key={participant.id} style={[styles.row, divider && styles.divider]}>
        <Avatar name={personName(participant.profile)} url={participant.profile?.avatar_url} size={34} />
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>{personName(participant.profile)}</Text>
          <Text style={styles.rowDetail}>
            {participant.status === 'PENDING'
              ? 'Aguardando pagamento'
              : participant.payment
                ? `${METHODS[participant.payment.method] ?? participant.payment.method} · ${formatPrice(participant.payment.amount)}`
                : 'Confirmado'}
          </Text>
        </View>
        {participant.status === 'CONFIRMED' &&
          (participant.checkedInAt ? (
            <CheckCircle2 size={22} color={colors.primary} accessibilityLabel="Check-in feito" />
          ) : active ? (
            <Pressable
              testID={`checkin-${index}`}
              accessibilityRole="button"
              onPress={() => act(participant.id, 'checkIn', [eventId, participant.id])}
              disabled={busy !== null}
              style={styles.smallButton}>
              {busy === participant.id ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.smallButtonText}>Check-in</Text>
              )}
            </Pressable>
          ) : null)}
        {active && (
          <Pressable
            testID={`remove-${index}`}
            accessibilityRole="button"
            accessibilityLabel={`Remover ${personName(participant.profile)}`}
            onPress={() => confirmRemove(participant.id, personName(participant.profile))}
            hitSlop={8}>
            <XCircle size={20} color={colors.text35} />
          </Pressable>
        )}
      </View>
    )
  }

  async function changeCover() {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      // a capa vai até 1MB no servidor
      quality: 0.4,
      base64: true,
    })
    if (picked.canceled || !picked.assets[0].base64) return
    const asset = picked.assets[0]
    await act('cover', 'uploadEventCover', [eventId, { base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' }], 'Capa atualizada.')
  }

  function confirmRemove(participationId: string, name: string) {
    Alert.alert('Remover participante?', `${name} sai do evento. Se pagou, o valor volta como crédito na carteira.`, [
      { text: 'Manter', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => act(participationId, 'removeParticipant', [participationId, eventId]) },
    ])
  }

  // O valor que volta para a carteira de quem pagou, para a confirmação
  const refundTotal = confirmed.reduce((sum, p) => sum + (p.payment?.amount ?? 0), 0)

  // Lista de inscritos em CSV, pela folha de compartilhamento (e-mail, WhatsApp, arquivos)
  async function exportList() {
    const lines = [
      'nome;usuario;situacao;pagamento;check-in',
      ...organizer!.participants.map((p) =>
        [
          personName(p.profile),
          p.profile?.username ?? '',
          p.status === 'CONFIRMED' ? 'confirmado' : 'pendente',
          p.payment ? `${METHODS[p.payment.method] ?? p.payment.method} ${formatPrice(p.payment.amount)}` : '',
          p.checkedInAt ? new Date(p.checkedInAt).toLocaleString('pt-BR') : '',
        ].join(';')
      ),
    ]
    await Share.share({ title: `Inscritos - ${event!.title}`, message: lines.join('\n') })
  }

  async function createCoupon() {
    const percent = Number(coupon.percent)
    const maxUses = Number(coupon.maxUses)
    if (coupon.code.trim().length < 3) return setMessage({ ok: false, text: 'O código precisa de ao menos 3 letras.' })
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) return setMessage({ ok: false, text: 'Desconto de 1% a 100%.' })
    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 999) return setMessage({ ok: false, text: 'Usos de 1 a 999.' })
    const ok = await act(
      'coupon',
      'createEventCoupon',
      [eventId, { code: coupon.code.trim(), percent_off: percent, max_uses: maxUses, group_wide: coupon.groupWide }],
      'Cupom criado.'
    )
    if (ok) setCoupon({ code: '', percent: '', maxUses: '', groupWide: false })
  }

  const inviteUrl = organizer.inviteToken ? `/eventos/${event.id}?invite=${organizer.inviteToken}` : null

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Gerenciar evento' }} />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: 16 + headerInset }]}>
          <Card style={styles.hero}>
            <Text testID="manage-title" style={styles.title}>
              {event.title}
            </Text>
            <View style={styles.stats}>
              <Stat value={`${event.confirmed_count}/${event.capacity}`} label="confirmados" />
              <Stat value={`${checkedIn}/${confirmed.length}`} label="check-in" />
              <Stat value={String(organizer.waitlist.length)} label="na fila" />
            </View>
            {!active && <Badge label={event.status === 'CANCELLED' ? 'Cancelado' : 'Concluído'} tone="muted" />}
          </Card>

          <OrganizerChecklist {...event} />

          {message && (
            <Text testID="manage-message" style={[styles.notice, !message.ok && styles.error]}>
              {message.text}
            </Text>
          )}

          <View style={styles.actions}>
            {active && (
              <Action
                testID="manage-scan"
                icon={<QrCode size={18} color={colors.primary} />}
                label="Check-in por QR"
                onPress={() => router.push({ pathname: '/manage/scan/[eventId]', params: { eventId } })}
              />
            )}
            {active && (
              <Action
                testID="manage-edit"
                icon={<Pencil size={18} color={colors.primary} />}
                label="Editar"
                onPress={() => router.push({ pathname: '/event-form', params: { mode: 'edit', eventId } })}
              />
            )}
            <Action
              testID="manage-duplicate"
              icon={<Copy size={18} color={colors.primary} />}
              label="Duplicar"
              onPress={() => router.push({ pathname: '/event-form', params: { mode: 'duplicate', eventId } })}
            />
            <Action
              testID="manage-finance"
              icon={<Wallet size={18} color={colors.primary} />}
              label="Financeiro"
              onPress={() => router.push({ pathname: '/finance/[eventId]', params: { eventId } })}
            />
          </View>

          {/* Antes dos inscritos: com a lista longa, os pedidos ficavam escondidos no fim */}
          {organizer.joinRequests.length > 0 && (
            <Section title="Pedidos de entrada">
              {organizer.joinRequests.map((request, index) => (
                <View key={request.id} style={[styles.row, index > 0 && styles.divider]}>
                  <Avatar name={personName(request.profile)} url={request.profile?.avatar_url} size={34} />
                  <Text style={[styles.rowTitle, styles.rowBody]}>{personName(request.profile)}</Text>
                  <Pressable
                    testID={`join-reject-${index}`}
                    accessibilityRole="button"
                    onPress={() => act(request.id, 'rejectEventJoinRequest', [request.id])}
                    disabled={busy !== null}
                    hitSlop={8}>
                    <Text style={styles.muted}>Recusar</Text>
                  </Pressable>
                  <Pressable
                    testID={`join-approve-${index}`}
                    accessibilityRole="button"
                    onPress={() => act(request.id, 'approveEventJoinRequest', [request.id])}
                    disabled={busy !== null}
                    style={styles.approve}>
                    <Text style={styles.approveText}>Aprovar</Text>
                  </Pressable>
                </View>
              ))}
            </Section>
          )}

          <Section title={`Inscritos (${organizer.participants.length})`}>
            {organizer.participants.length === 0 ? (
              <Text style={styles.empty}>Ninguém se inscreveu ainda.</Text>
            ) : (
              <>
                {teams.length > 1
                  ? [
                      ...teams.map((team) => ({
                        key: team.id,
                        title: team.name,
                        detail: `${organizer.participants.filter((p) => p.teamId === team.id && p.status === 'CONFIRMED').length}/${team.capacity}`,
                        members: organizer.participants.filter((p) => p.teamId === team.id),
                      })),
                      {
                        key: 'none',
                        title: 'Sem time',
                        detail: '',
                        members: organizer.participants.filter((p) => !teams.some((team) => team.id === p.teamId)),
                      },
                    ]
                      .filter((group) => group.key !== 'none' || group.members.length > 0)
                      .map((group) => (
                        <View key={group.key} testID={`manage-team-${group.key}`} style={styles.teamGroup}>
                          <View style={styles.teamHeader}>
                            <Text style={styles.teamName}>{group.title}</Text>
                            <Text style={styles.teamCount}>{group.detail}</Text>
                          </View>
                          {group.members.length === 0 ? (
                            <Text style={styles.teamEmpty}>Ninguém neste time ainda.</Text>
                          ) : (
                            group.members.map((participant, position) =>
                              renderParticipant(participant, organizer.participants.indexOf(participant), position > 0)
                            )
                          )}
                        </View>
                      ))
                  : organizer.participants.map((participant, index) => renderParticipant(participant, index, index > 0))}
                <Pressable testID="manage-export" accessibilityRole="button" onPress={exportList} style={styles.inline}>
                  <FileDown size={16} color={colors.primary} />
                  <Text style={styles.link}>Exportar lista</Text>
                </Pressable>
              </>
            )}
          </Section>

          {organizer.waitlist.length > 0 && (
            <Section title="Fila de espera">
              {organizer.waitlist.map((entry, index) => (
                <View key={entry.id} style={[styles.row, index > 0 && styles.divider]}>
                  <Text style={styles.position}>#{entry.position}</Text>
                  <Text style={[styles.rowTitle, styles.rowBody]}>{personName(entry.profile)}</Text>
                  {entry.status === 'NOTIFIED' && <Badge label="Vaga reservada" tone="warning" />}
                </View>
              ))}
            </Section>
          )}

          {inviteUrl && (
            <Section title="Convite">
              <Text style={styles.rowDetail}>Quem abre o link entra no evento privado sem precisar de aprovação.</Text>
              <View style={styles.pair}>
                <Button
                  testID="manage-invite"
                  label="Enviar convite"
                  icon={<Link2 size={17} color={colors.primaryForeground} />}
                  onPress={() => shareLink(`Convite para ${event.title}`, inviteUrl)}
                  style={styles.flex}
                />
                <Pressable
                  testID="manage-invite-reset"
                  accessibilityRole="button"
                  onPress={() => act('invite', 'regenerateEventInvite', [eventId], 'Link novo gerado. O anterior parou de valer.')}
                  style={styles.secondary}>
                  <Text style={styles.secondaryText}>Trocar link</Text>
                </Pressable>
              </View>
            </Section>
          )}

          {event.price > 0 && active && (
            <Section title="Cupons de desconto">
              {coupons.map((item) => (
                <View key={item.id} style={styles.row}>
                  <View style={styles.rowBody}>
                    <Text style={styles.code}>{item.code}</Text>
                    <Text style={styles.rowDetail}>
                      {item.percent_off}% · {item.uses_count}/{item.max_uses ?? '∞'} usos
                      {item.group_id ? ' · vale no grupo' : ''}
                    </Text>
                  </View>
                  <Switch
                    value={item.active}
                    onValueChange={(value) => {
                      act(item.id, 'toggleEventCoupon', [eventId, item.id, value])
                    }}
                    trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.15)' }}
                    thumbColor="#FFFFFF"
                    accessibilityLabel={`Cupom ${item.code} ativo`}
                  />
                </View>
              ))}
              <View style={styles.pair}>
                <TextInput
                  testID="coupon-new-code"
                  value={coupon.code}
                  onChangeText={(code) => setCoupon((current) => ({ ...current, code: code.toUpperCase() }))}
                  placeholder="CÓDIGO"
                  placeholderTextColor={colors.text35}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={[styles.input, styles.flex]}
                />
                <TextInput
                  testID="coupon-new-percent"
                  value={coupon.percent}
                  onChangeText={(percent) => setCoupon((current) => ({ ...current, percent }))}
                  placeholder="% off"
                  placeholderTextColor={colors.text35}
                  keyboardType="number-pad"
                  style={[styles.input, styles.short]}
                />
                <TextInput
                  testID="coupon-new-uses"
                  value={coupon.maxUses}
                  onChangeText={(maxUses) => setCoupon((current) => ({ ...current, maxUses }))}
                  placeholder="usos"
                  placeholderTextColor={colors.text35}
                  keyboardType="number-pad"
                  style={[styles.input, styles.short]}
                />
              </View>
              {event.group_id && (
                <View style={styles.row}>
                  <Text style={[styles.rowDetail, styles.rowBody]}>Vale em todos os eventos do grupo</Text>
                  <Switch
                    value={coupon.groupWide}
                    onValueChange={(groupWide) => setCoupon((current) => ({ ...current, groupWide }))}
                    trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.15)' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              )}
              <Button testID="coupon-new-submit" label="Criar cupom" onPress={createCoupon} loading={busy === 'coupon'} />
            </Section>
          )}

          <Section title="Regras e diretrizes">
            <TextInput
              testID="manage-rules"
              value={rules ?? ''}
              onChangeText={setRules}
              placeholder="Ex.: chegar 15 minutos antes, chuteira society"
              placeholderTextColor={colors.text35}
              multiline
              maxLength={2000}
              style={[styles.input, styles.area]}
            />
            <Button
              testID="manage-rules-save"
              label="Salvar regras"
              onPress={() => act('rules', 'updateEventRules', [eventId, rules ?? ''], 'Regras salvas.')}
              loading={busy === 'rules'}
            />
          </Section>

          {active && (
            <Section title="Mensagem aos confirmados">
              <TextInput
                testID="manage-broadcast"
                value={broadcast}
                onChangeText={setBroadcast}
                placeholder="Aviso para todos os inscritos confirmados"
                placeholderTextColor={colors.text35}
                multiline
                maxLength={500}
                style={[styles.input, styles.area]}
              />
              <Button
                testID="manage-broadcast-send"
                label="Enviar aviso"
                icon={<Send size={17} color={colors.primaryForeground} />}
                onPress={async () => {
                  if (await act('broadcast', 'sendEventBroadcast', [eventId, broadcast], 'Aviso enviado.')) setBroadcast('')
                }}
                loading={busy === 'broadcast'}
              />
            </Section>
          )}

          <Section title="Capa">
            {event.cover_url ? <Image source={event.cover_url} style={styles.cover} contentFit="cover" /> : null}
            <Pressable testID="manage-cover" accessibilityRole="button" onPress={changeCover} style={styles.inline}>
              {busy === 'cover' ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <ImagePlus size={16} color={colors.primary} />
                  <Text style={styles.link}>{event.cover_url ? 'Trocar capa' : 'Adicionar capa'}</Text>
                </>
              )}
            </Pressable>
          </Section>

          {active && (
            <Pressable testID="manage-cancel" accessibilityRole="button" onPress={() => setCancelOpen(true)} style={styles.danger}>
              <Text style={styles.dangerText}>Cancelar evento</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <CancelEventDialog
        visible={cancelOpen}
        title={event.title}
        confirmedCount={confirmed.length}
        refundLabel={refundTotal > 0 ? formatPrice(refundTotal) : null}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => {
          setCancelOpen(false)
          act('cancel', 'cancelEvent', [eventId], 'Evento cancelado.')
        }}
      />
    </Screen>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </Card>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function Action(props: { testID: string; icon: ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      onPress={props.onPress}
      style={({ pressed }) => [styles.action, pressed && styles.dim]}>
      {props.icon}
      <Text style={styles.actionText}>{props.label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  failed: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center', marginTop: 140, fontSize: 15, padding: 24 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  hero: { padding: 18, gap: 14 },
  title: { fontFamily: fonts.headingBlack, fontSize: 21, lineHeight: 26, color: colors.text },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.input },
  statValue: { fontFamily: fonts.headingBlack, fontSize: 18, color: colors.primary },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.text50 },
  notice: { fontFamily: fonts.body, fontSize: 14, color: colors.primary, textAlign: 'center' },
  error: { color: colors.destructive },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: {
    flexGrow: 1,
    flexBasis: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 46,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.25)',
    backgroundColor: 'rgba(74,222,128,0.06)',
  },
  actionText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },
  dim: { opacity: 0.6 },
  section: { padding: 16, gap: 12 },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 16, color: colors.text },
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  divider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  teamGroup: { gap: 2, marginTop: 6 },
  teamHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingVertical: 6 },
  teamName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },
  teamCount: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text50 },
  teamEmpty: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, paddingBottom: 6 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  rowDetail: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.text50 },
  muted: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text50 },
  position: { width: 34, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text50 },
  code: { fontFamily: fonts.bodyBold, fontSize: 14, letterSpacing: 1, color: colors.primary },
  smallButton: {
    minWidth: 84,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.35)',
  },
  smallButtonText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.primary },
  approve: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.primary },
  approveText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primaryForeground },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 32 },
  link: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },
  pair: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  secondary: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  secondaryText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.foreground },
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
  area: { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' },
  cover: { height: 150, borderRadius: 14 },
  danger: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    backgroundColor: 'rgba(248,113,113,0.05)',
    marginTop: 8,
  },
  dangerText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.destructive },
})
