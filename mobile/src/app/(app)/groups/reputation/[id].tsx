import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { CircleMinus, Star } from 'lucide-react-native'
import { useCallback, useState, type ReactNode } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Avatar } from '@/components/avatar'
import { Card, Field, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { runAction } from '@/lib/api'
import { useHeaderInset } from '@/lib/header'
import { supabase } from '@/lib/supabase'
import { colors, fonts, radius } from '@/lib/theme'

type Indicator = 'positive' | 'negative' | null
type MemberRow = {
  member_id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  incident_count: number
  contribution_count: number
  indicator: Indicator
}
type MemberField = { id: string; label: string; unit: string | null; active: boolean }
type Config = { fields: MemberField[] }

async function fetchData(groupId: string, userId: string) {
  const [{ data: membership }, overviewResult, configResult] = await Promise.all([
    supabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', userId).maybeSingle(),
    runAction<MemberRow[]>('groupReputationOverview', groupId),
    runAction<Config>('groupReputationConfig', groupId),
  ])
  return {
    isOwner: membership?.role === 'OWNER',
    members: 'ok' in overviewResult ? overviewResult.ok : [],
    config: 'ok' in configResult ? configResult.ok : { fields: [] },
  }
}

function IndicatorIcon({ indicator }: { indicator: Indicator }) {
  if (indicator === 'positive') return <Star size={14} color={colors.primary} fill={colors.primary} />
  if (indicator === 'negative') return <CircleMinus size={14} color={colors.destructive} />
  return null
}

// Painel de avaliação: visível só pra dono/gestores (ver groups/[id].tsx).
// Faltas e contribuições de cada membro ficam no detalhe (reputation-member);
// aqui só a lista com a contagem e o indicador, e os campos customizados do
// grupo, que só o dono cria/edita/desativa.
export default function GroupReputationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useSession()
  const userId = session!.user.id
  const headerInset = useHeaderInset()

  const [data, setData] = useState<Awaited<ReturnType<typeof fetchData>> | undefined>(undefined)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldUnit, setNewFieldUnit] = useState('')

  const load = useCallback(async () => setData(await fetchData(id, userId)), [id, userId])

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

  async function addField() {
    if (!newFieldLabel.trim()) return
    if (await act('new-field', 'createMemberField', [id, newFieldLabel, newFieldUnit])) {
      setNewFieldLabel('')
      setNewFieldUnit('')
      await load()
    }
  }

  async function toggleField(field: MemberField) {
    if (await act(field.id, 'toggleMemberField', [id, field.id, !field.active])) await load()
  }

  if (data === undefined) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Avaliação de membros' }} />
        <ActivityIndicator style={styles.flex} color={colors.primary} />
      </Screen>
    )
  }

  const { isOwner, members, config } = data

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Avaliação de membros' }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: 16 + headerInset }]}>
        {message && <Text style={styles.notice}>{message}</Text>}
        <Text style={styles.hint}>Visível só para dono e gestores do grupo. Ninguém mais vê estes registros.</Text>

        <Section title="Membros">
          {members.length === 0 && <Text style={styles.empty}>Nenhum membro no grupo ainda.</Text>}
          {members.map((m) => {
            const name = m.full_name ?? m.username ?? 'Usuário'
            return (
              <Pressable
                key={m.member_id}
                onPress={() => router.push({ pathname: '/groups/reputation-member', params: { groupId: id, memberId: m.member_id } })}
                style={styles.memberRow}>
                <Avatar name={name} url={m.avatar_url} size={36} />
                <View style={styles.flex}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName}>{name}</Text>
                    <IndicatorIcon indicator={m.indicator} />
                  </View>
                  <Text style={styles.memberDetail}>
                    {m.incident_count} {m.incident_count === 1 ? 'falta' : 'faltas'} · {m.contribution_count} {m.contribution_count === 1 ? 'contribuição' : 'contribuições'}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </Section>

        <Section title="Campos customizados">
          <Text style={styles.hint}>Ex.: velocidade de cronagem, com data de cada medição. Deixe sem campos se não precisar.</Text>
          {config.fields.length === 0 && <Text style={styles.empty}>Nenhum campo customizado criado ainda.</Text>}
          {config.fields.map((f) => (
            <View key={f.id} style={styles.itemRow}>
              <Text style={[styles.itemText, !f.active && styles.itemInactive]}>
                {f.label}
                {f.unit ? ` (${f.unit})` : ''}
              </Text>
              {isOwner && <TextButton label={busy === f.id ? '...' : f.active ? 'Ativo' : 'Inativo'} onPress={() => toggleField(f)} disabled={busy === f.id} />}
            </View>
          ))}
          {isOwner && (
            <View style={styles.addForm}>
              <Field label="Nome do campo" placeholder="Ex.: Cronagem" value={newFieldLabel} onChangeText={setNewFieldLabel} maxLength={60} />
              <Field label="Unidade (opcional)" placeholder="Ex.: m/s" value={newFieldUnit} onChangeText={setNewFieldUnit} maxLength={20} />
              <TextButton label={busy === 'new-field' ? 'Adicionando...' : 'Adicionar'} onPress={addField} disabled={busy === 'new-field' || !newFieldLabel.trim()} />
            </View>
          )}
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

function TextButton({ label, onPress, disabled, muted }: { label: string; onPress: () => void; disabled?: boolean; muted?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.textButton, muted && styles.textButtonMuted, disabled && styles.textButtonDim]}>
      <Text style={[styles.textButtonLabel, muted && styles.textButtonLabelMuted]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  notice: { fontFamily: fonts.body, fontSize: 13, color: colors.destructive },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.text35 },
  section: { padding: 16, gap: 10 },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text70, textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.text35 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  memberDetail: { fontFamily: fonts.body, fontSize: 11, color: colors.text40 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 6 },
  itemText: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text },
  itemInactive: { color: colors.text35, textDecorationLine: 'line-through' },
  addForm: { gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4 },
  textButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(74,222,128,0.1)',
  },
  textButtonMuted: { backgroundColor: 'rgba(255,255,255,0.05)' },
  textButtonDim: { opacity: 0.5 },
  textButtonLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.primary },
  textButtonLabelMuted: { color: colors.text40 },
})
