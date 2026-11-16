import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { ChevronDown, ChevronRight } from 'lucide-react-native'
import { useCallback, useState, type ReactNode } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Avatar } from '@/components/avatar'
import { Card, Field, Screen } from '@/components/ui'
import { runAction } from '@/lib/api'
import { useHeaderInset } from '@/lib/header'
import { colors, fonts, radius } from '@/lib/theme'

type CriterionRow = { criterion_id: string; name: string; active: boolean; my_score: number | null; average: number | null; votes: number }
type TaskCompletion = { id: string; completed_at: string; marked_by_name: string | null }
type TaskRow = { task_id: string; title: string; description: string | null; active: boolean; archived: boolean; completions: TaskCompletion[] }
type FieldEntry = { id: string; value: string; recorded_at: string; recorded_by_name: string | null }
type MemberField = { field_id: string; label: string; unit: string | null; active: boolean; entries: FieldEntry[] }
type Detail = {
  member: { full_name: string | null; username: string | null; avatar_url: string | null } | null
  average: number | null
  criteria: CriterionRow[]
  tasks: TaskRow[]
  fields: MemberField[]
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

function fmtDateOnly(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

// Detalhe de um membro: nota por critério, mini-missões e campos
// customizados do grupo — mesma lógica do painel do site (features/reputacao).
export default function MemberReputationScreen() {
  const { groupId, memberId } = useLocalSearchParams<{ groupId: string; memberId: string }>()
  const headerInset = useHeaderInset()

  const [data, setData] = useState<Detail | null | undefined>(undefined)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({})
  const [showArchived, setShowArchived] = useState(false)
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

  async function saveScore(criterionId: string) {
    const raw = scoreDrafts[criterionId]
    const score = Number(raw)
    if (!Number.isInteger(score) || score < 0 || score > 10) {
      setMessage('Informe uma nota inteira de 0 a 10.')
      return
    }
    if (await act(criterionId, 'rateMember', [groupId, criterionId, memberId, score])) {
      setScoreDrafts((prev) => ({ ...prev, [criterionId]: '' }))
      await load()
    }
  }

  async function completeTask(taskId: string) {
    if (await act(taskId, 'completeTask', [groupId, taskId, memberId])) await load()
  }

  async function undoCompletion(completionId: string) {
    if (await act(completionId, 'undoTaskCompletion', [groupId, completionId])) await load()
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
  const activeCriteria = data.criteria.filter((c) => c.active)
  const visibleTasks = data.tasks.filter((t) => !t.archived)
  const archivedTasks = data.tasks.filter((t) => t.archived)

  return (
    <Screen>
      <Stack.Screen options={{ title: name }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: 16 + headerInset }]}>
        {message && <Text style={styles.notice}>{message}</Text>}

        <View style={styles.header}>
          <Avatar name={name} url={data.member?.avatar_url} size={44} />
          <Text style={styles.headerName}>{name}</Text>
          {data.average !== null ? <Text style={styles.headerScore}>{data.average.toFixed(1)}</Text> : <Text style={styles.empty}>Sem notas</Text>}
        </View>

        <Section title="Critérios de avaliação">
          {activeCriteria.length === 0 && <Text style={styles.empty}>Nenhum critério ativo no grupo ainda.</Text>}
          {activeCriteria.map((c) => (
            <View key={c.criterion_id} style={styles.criterionRow}>
              <View style={styles.criterionHeader}>
                <Text style={styles.itemText}>{c.name}</Text>
                <Text style={styles.memberDetail}>{c.average !== null ? `Média: ${c.average.toFixed(1)} (${c.votes})` : 'Sem notas ainda'}</Text>
              </View>
              <View style={styles.rowGap}>
                <Field
                  label="Nota"
                  value={scoreDrafts[c.criterion_id] ?? (c.my_score !== null ? String(c.my_score) : '')}
                  onChangeText={(v) => setScoreDrafts((prev) => ({ ...prev, [c.criterion_id]: v }))}
                  placeholder="0-10"
                  keyboardType="number-pad"
                  style={styles.scoreInput}
                />
                <TextButton
                  label={busy === c.criterion_id ? '...' : c.my_score !== null ? 'Atualizar' : 'Salvar'}
                  onPress={() => saveScore(c.criterion_id)}
                  disabled={busy === c.criterion_id}
                />
              </View>
            </View>
          ))}
        </Section>

        <Section title="Mini-missões">
          {visibleTasks.length === 0 && <Text style={styles.empty}>Nenhuma mini-missão visível no momento.</Text>}
          {visibleTasks.map((t) => (
            <TaskBlock key={t.task_id} task={t} busy={busy} onComplete={() => completeTask(t.task_id)} onUndo={undoCompletion} />
          ))}
          {archivedTasks.length > 0 && (
            <View>
              <Pressable onPress={() => setShowArchived((v) => !v)} style={styles.archivedToggle}>
                {showArchived ? <ChevronDown size={14} color={colors.text40} /> : <ChevronRight size={14} color={colors.text40} />}
                <Text style={styles.archivedToggleText}>Arquivadas ({archivedTasks.length})</Text>
              </Pressable>
              {showArchived && archivedTasks.map((t) => <TaskBlock key={t.task_id} task={t} busy={busy} onComplete={() => completeTask(t.task_id)} onUndo={undoCompletion} />)}
            </View>
          )}
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

function TextButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.textButton, disabled && styles.textButtonDim]}>
      <Text style={styles.textButtonLabel}>{label}</Text>
    </Pressable>
  )
}

function TaskBlock({ task, busy, onComplete, onUndo }: { task: TaskRow; busy: string | null; onComplete: () => void; onUndo: (id: string) => void }) {
  return (
    <View style={styles.taskBlock}>
      <View style={styles.taskHeader}>
        <View style={styles.flex}>
          <Text style={[styles.itemText, !task.active && styles.itemInactive]}>{task.title}</Text>
          {task.description ? <Text style={styles.memberDetail}>{task.description}</Text> : null}
        </View>
        {task.active && !task.archived && (
          <TextButton label={busy === task.task_id ? '...' : 'Marcar cumprida'} onPress={onComplete} disabled={busy === task.task_id} />
        )}
      </View>
      {task.completions.map((c) => (
        <View key={c.id} style={styles.entryRow}>
          <Text style={styles.memberDetail}>
            Cumprida em {fmtDate(c.completed_at)}
            {c.marked_by_name ? ` por ${c.marked_by_name}` : ''}
          </Text>
          <Pressable onPress={() => onUndo(c.id)}>
            <Text style={styles.deleteLabel}>desfazer</Text>
          </Pressable>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  notice: { fontFamily: fonts.body, fontSize: 13, color: colors.destructive },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerName: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 18, color: colors.text },
  headerScore: { fontFamily: fonts.bodyBold, fontSize: 24, color: colors.primary },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.text35 },
  section: { padding: 16, gap: 10 },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text70, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemText: { fontFamily: fonts.body, fontSize: 14, color: colors.text },
  itemInactive: { color: colors.text35 },
  memberDetail: { fontFamily: fonts.body, fontSize: 11, color: colors.text40 },
  criterionRow: { gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  criterionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  rowGap: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  scoreInput: { width: 70, textAlign: 'center' },
  flexInput: { flex: 1 },
  taskBlock: { gap: 6, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  taskHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  entryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  entryValue: { fontFamily: fonts.bodySemi, color: colors.text70 },
  deleteLabel: { fontFamily: fonts.body, fontSize: 11, color: 'rgba(239,68,68,0.7)' },
  fieldBlock: { gap: 6, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  archivedToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  archivedToggleText: { fontFamily: fonts.body, fontSize: 12, color: colors.text40 },
  textButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: 'rgba(74,222,128,0.1)' },
  textButtonDim: { opacity: 0.5 },
  textButtonLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.primary },
})
