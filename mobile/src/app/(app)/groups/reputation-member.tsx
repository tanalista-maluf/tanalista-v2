import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { CircleMinus, Star } from 'lucide-react-native'
import { useCallback, useState, type ReactNode } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Avatar } from '@/components/avatar'
import { Card, Field, Screen } from '@/components/ui'
import { runAction } from '@/lib/api'
import { useHeaderInset } from '@/lib/header'
import { colors, fonts, radius } from '@/lib/theme'

type Indicator = 'positive' | 'negative' | null
type IncidentRow = { id: string; severity: 'LEVE' | 'MEDIA' | 'GRAVE'; description: string; created_at: string; created_by_name: string | null }
type ContributionRow = { id: string; size: 'PEQUENA' | 'MEDIA' | 'GRANDE'; description: string; created_at: string; created_by_name: string | null }
type FieldEntry = { id: string; value: string; recorded_at: string; recorded_by_name: string | null }
type MemberField = { field_id: string; label: string; unit: string | null; active: boolean; entries: FieldEntry[] }
type Detail = {
  member: { full_name: string | null; username: string | null; avatar_url: string | null } | null
  incident_count: number
  contribution_count: number
  indicator: Indicator
  incidents: IncidentRow[]
  contributions: ContributionRow[]
  fields: MemberField[]
}

const SEVERITIES = ['LEVE', 'MEDIA', 'GRAVE'] as const
const SEVERITY_LABELS: Record<string, string> = { LEVE: 'Leve', MEDIA: 'Média', GRAVE: 'Grave' }
const SIZES = ['PEQUENA', 'MEDIA', 'GRANDE'] as const
const SIZE_LABELS: Record<string, string> = { PEQUENA: 'Pequena', MEDIA: 'Média', GRANDE: 'Grande' }

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDateOnly(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

function IndicatorIcon({ indicator }: { indicator: Indicator }) {
  if (indicator === 'positive') return <Star size={20} color={colors.primary} fill={colors.primary} />
  if (indicator === 'negative') return <CircleMinus size={20} color={colors.destructive} />
  return null
}

// Detalhe de um membro: faltas e contribuições (gravidade/porte +
// justificativa) e os campos customizados do grupo — mesma lógica do painel
// do site (features/reputacao).
export default function MemberReputationScreen() {
  const { groupId, memberId } = useLocalSearchParams<{ groupId: string; memberId: string }>()
  const headerInset = useHeaderInset()

  const [data, setData] = useState<Detail | null | undefined>(undefined)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [incidentSeverity, setIncidentSeverity] = useState<typeof SEVERITIES[number]>('LEVE')
  const [incidentDescription, setIncidentDescription] = useState('')
  const [contributionSize, setContributionSize] = useState<typeof SIZES[number]>('PEQUENA')
  const [contributionDescription, setContributionDescription] = useState('')
  const [fieldDrafts, setFieldDrafts] = useState<Record<string, { value: string; date: string }>>({})

  const load = useCallback(async () => {
    const result = await runAction<Detail>('memberReputationDetail', groupId, memberId)
    setData('ok' in result ? result.ok : null)
  }, [groupId, memberId])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  async function act(key: string, name: string, args: unknown[]) {
    setBusy(key)
    setMessage(null)
    const result = await runAction(name, ...args)
    setBusy(null)
    if ('error' in result) setMessage(result.error)
    return !('error' in result)
  }

  async function addIncident() {
    if (incidentDescription.trim().length < 3) {
      setMessage('Descreva a falta (mínimo 3 caracteres).')
      return
    }
    if (await act('new-incident', 'createIncident', [groupId, memberId, incidentSeverity, incidentDescription])) {
      setIncidentDescription('')
      await load()
    }
  }

  async function deleteIncident(incidentId: string) {
    if (await act(incidentId, 'deleteIncident', [groupId, incidentId])) await load()
  }

  async function addContribution() {
    if (contributionDescription.trim().length < 3) {
      setMessage('Descreva a contribuição (mínimo 3 caracteres).')
      return
    }
    if (await act('new-contribution', 'createContribution', [groupId, memberId, contributionSize, contributionDescription])) {
      setContributionDescription('')
      await load()
    }
  }

  async function deleteContribution(contributionId: string) {
    if (await act(contributionId, 'deleteContribution', [groupId, contributionId])) await load()
  }

  function fieldDraft(fieldId: string) {
    return fieldDrafts[fieldId] ?? { value: '', date: todayInput() }
  }

  async function addFieldEntry(fieldId: string) {
    const draft = fieldDraft(fieldId)
    if (!draft.value.trim()) {
      setMessage('Informe o valor.')
      return
    }
    if (await act(fieldId, 'addMemberFieldEntry', [groupId, fieldId, memberId, draft.value, draft.date])) {
      setFieldDrafts((prev) => ({ ...prev, [fieldId]: { value: '', date: todayInput() } }))
      await load()
    }
  }

  async function deleteFieldEntry(entryId: string) {
    if (await act(entryId, 'deleteMemberFieldEntry', [groupId, entryId])) await load()
  }

  if (data === undefined) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Membro' }} />
        <ActivityIndicator style={styles.flex} color={colors.primary} />
      </Screen>
    )
  }

  if (!data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Membro' }} />
        <Text style={styles.notice}>Apenas dono ou gestores do grupo veem esta página.</Text>
      </Screen>
    )
  }

  const name = data.member?.full_name ?? data.member?.username ?? 'Usuário'

  return (
    <Screen>
      <Stack.Screen options={{ title: name }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: 16 + headerInset }]}>
        {message && <Text style={styles.notice}>{message}</Text>}

        <View style={styles.header}>
          <Avatar name={name} url={data.member?.avatar_url} size={44} />
          <View style={styles.flex}>
            <View style={styles.headerNameRow}>
              <Text style={styles.headerName}>{name}</Text>
              <IndicatorIcon indicator={data.indicator} />
            </View>
            <Text style={styles.memberDetail}>
              {data.incident_count} {data.incident_count === 1 ? 'falta' : 'faltas'} · {data.contribution_count} {data.contribution_count === 1 ? 'contribuição' : 'contribuições'}
            </Text>
          </View>
        </View>

        <Section title="Faltas">
          <View style={styles.segmented}>
            {SEVERITIES.map((s) => (
              <Pressable
                key={s}
                onPress={() => setIncidentSeverity(s)}
                style={[styles.segment, incidentSeverity === s && styles.segmentActiveDestructive]}>
                <Text style={[styles.segmentLabel, incidentSeverity === s && styles.segmentLabelActive]}>{SEVERITY_LABELS[s]}</Text>
              </Pressable>
            ))}
          </View>
          <Field
            label="Justificativa"
            placeholder="O que aconteceu"
            value={incidentDescription}
            onChangeText={setIncidentDescription}
            multiline
            numberOfLines={3}
          />
          <TextButton
            label={busy === 'new-incident' ? 'Registrando...' : 'Registrar falta'}
            onPress={addIncident}
            disabled={busy === 'new-incident'}
            destructive
          />
          {data.incidents.length === 0 && <Text style={styles.empty}>Nenhuma falta registrada.</Text>}
          {data.incidents.map((i) => (
            <View key={i.id} style={styles.entryBlock}>
              <View style={styles.entryHeader}>
                <Text style={[styles.badge, styles.badgeDestructive]}>{SEVERITY_LABELS[i.severity]}</Text>
                <Pressable onPress={() => deleteIncident(i.id)}>
                  <Text style={styles.deleteLabel}>excluir</Text>
                </Pressable>
              </View>
              <Text style={styles.itemText}>{i.description}</Text>
              <Text style={styles.memberDetail}>
                {fmtDateTime(i.created_at)}{i.created_by_name ? ` · ${i.created_by_name}` : ''}
              </Text>
            </View>
          ))}
        </Section>

        <Section title="Contribuições">
          <View style={styles.segmented}>
            {SIZES.map((s) => (
              <Pressable
                key={s}
                onPress={() => setContributionSize(s)}
                style={[styles.segment, contributionSize === s && styles.segmentActivePrimary]}>
                <Text style={[styles.segmentLabel, contributionSize === s && styles.segmentLabelActive]}>{SIZE_LABELS[s]}</Text>
              </Pressable>
            ))}
          </View>
          <Field
            label="Justificativa"
            placeholder="O que foi feito"
            value={contributionDescription}
            onChangeText={setContributionDescription}
            multiline
            numberOfLines={3}
          />
          <TextButton
            label={busy === 'new-contribution' ? 'Registrando...' : 'Registrar contribuição'}
            onPress={addContribution}
            disabled={busy === 'new-contribution'}
          />
          {data.contributions.length === 0 && <Text style={styles.empty}>Nenhuma contribuição registrada.</Text>}
          {data.contributions.map((c) => (
            <View key={c.id} style={styles.entryBlock}>
              <View style={styles.entryHeader}>
                <Text style={[styles.badge, styles.badgePrimary]}>{SIZE_LABELS[c.size]}</Text>
                <Pressable onPress={() => deleteContribution(c.id)}>
                  <Text style={styles.deleteLabel}>excluir</Text>
                </Pressable>
              </View>
              <Text style={styles.itemText}>{c.description}</Text>
              <Text style={styles.memberDetail}>
                {fmtDateTime(c.created_at)}{c.created_by_name ? ` · ${c.created_by_name}` : ''}
              </Text>
            </View>
          ))}
        </Section>

        <Section title="Campos customizados">
          {data.fields.length === 0 && <Text style={styles.empty}>O grupo não cadastrou campos customizados.</Text>}
          {data.fields.map((f) => {
            const draft = fieldDraft(f.field_id)
            return (
              <View key={f.field_id} style={styles.fieldBlock}>
                <Text style={styles.itemText}>
                  {f.label}
                  {f.unit ? ` (${f.unit})` : ''}
                </Text>
                {f.entries.map((e) => (
                  <View key={e.id} style={styles.entryRow}>
                    <Text style={styles.memberDetail}>
                      <Text style={styles.entryValue}>
                        {e.value}
                        {f.unit ? ` ${f.unit}` : ''}
                      </Text>{' '}
                      em {fmtDateOnly(e.recorded_at)}
                      {e.recorded_by_name ? ` · ${e.recorded_by_name}` : ''}
                    </Text>
                    <Pressable onPress={() => deleteFieldEntry(e.id)}>
                      <Text style={styles.deleteLabel}>excluir</Text>
                    </Pressable>
                  </View>
                ))}
                {f.active && (
                  <View style={styles.rowGap}>
                    <Field
                      label={`Valor${f.unit ? ` (${f.unit})` : ''}`}
                      value={draft.value}
                      onChangeText={(v) => setFieldDrafts((prev) => ({ ...prev, [f.field_id]: { ...draft, value: v } }))}
                      style={styles.flexInput}
                    />
                    <TextButton label={busy === f.field_id ? '...' : 'Adicionar'} onPress={() => addFieldEntry(f.field_id)} disabled={busy === f.field_id} />
                  </View>
                )}
              </View>
            )
          })}
        </Section>
      </ScrollView>
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

function TextButton({ label, onPress, disabled, destructive }: { label: string; onPress: () => void; disabled?: boolean; destructive?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.textButton, destructive && styles.textButtonDestructive, disabled && styles.textButtonDim]}>
      <Text style={[styles.textButtonLabel, destructive && styles.textButtonLabelDestructive]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  notice: { fontFamily: fonts.body, fontSize: 13, color: colors.destructive },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerName: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.text },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.text35 },
  section: { padding: 16, gap: 10 },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text70, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemText: { fontFamily: fonts.body, fontSize: 14, color: colors.text },
  memberDetail: { fontFamily: fonts.body, fontSize: 11, color: colors.text40 },
  rowGap: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  flexInput: { flex: 1 },
  segmented: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  segmentActiveDestructive: { backgroundColor: 'rgba(239,68,68,0.15)' },
  segmentActivePrimary: { backgroundColor: 'rgba(74,222,128,0.15)' },
  segmentLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.text40 },
  segmentLabelActive: { color: colors.text },
  entryBlock: { gap: 4, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  entryValue: { fontFamily: fonts.bodySemi, color: colors.text70 },
  badge: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  badgeDestructive: { color: colors.destructive, backgroundColor: 'rgba(239,68,68,0.12)' },
  badgePrimary: { color: colors.primary, backgroundColor: 'rgba(74,222,128,0.12)' },
  deleteLabel: { fontFamily: fonts.body, fontSize: 11, color: 'rgba(239,68,68,0.7)' },
  fieldBlock: { gap: 6, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  textButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: 'rgba(74,222,128,0.1)', alignItems: 'center' },
  textButtonDestructive: { backgroundColor: 'rgba(239,68,68,0.1)' },
  textButtonDim: { opacity: 0.5 },
  textButtonLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.primary },
  textButtonLabelDestructive: { color: colors.destructive },
})
