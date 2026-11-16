import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { ChevronDown, ChevronRight } from 'lucide-react-native'
import { useCallback, useState, type ReactNode } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Avatar } from '@/components/avatar'
import { Card, Field, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { runAction } from '@/lib/api'
import { useHeaderInset } from '@/lib/header'
import { supabase } from '@/lib/supabase'
import { colors, fonts, radius } from '@/lib/theme'

type MemberRow = {
  member_id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  average: number | null
  rating_count: number
  task_count: number
}
type Criterion = { id: string; name: string; active: boolean }
type Task = { id: string; title: string; description: string | null; active: boolean; archived: boolean }
type MemberField = { id: string; label: string; unit: string | null; active: boolean }
type Config = { criteria: Criterion[]; tasks: Task[]; fields: MemberField[] }

async function fetchData(groupId: string, userId: string) {
  const [{ data: membership }, overviewResult, configResult] = await Promise.all([
    supabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', userId).maybeSingle(),
    runAction<MemberRow[]>('groupReputationOverview', groupId),
    runAction<Config>('groupReputationConfig', groupId),
  ])
  return {
    isOwner: membership?.role === 'OWNER',
    members: 'ok' in overviewResult ? overviewResult.ok : [],
    config: 'ok' in configResult ? configResult.ok : { criteria: [], tasks: [], fields: [] },
  }
}

// Painel de avaliação: visível só pra dono/gestores (ver groups/[id].tsx).
// Mesmas regras do site (features/reputacao): critério e campo customizado
// só o dono cria/edita/desativa; mini-missão, dono ou gestor.
export default function GroupReputationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useSession()
  const userId = session!.user.id
  const headerInset = useHeaderInset()

  const [data, setData] = useState<Awaited<ReturnType<typeof fetchData>> | undefined>(undefined)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [newCriterion, setNewCriterion] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldUnit, setNewFieldUnit] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const [editingCriterion, setEditingCriterion] = useState<string | null>(null)
  const [editCriterionName, setEditCriterionName] = useState('')
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [editTaskTitle, setEditTaskTitle] = useState('')
  const [editTaskDescription, setEditTaskDescription] = useState('')

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

  async function addCriterion() {
    if (!newCriterion.trim()) return
    if (await act('new-criterion', 'createCriterion', [id, newCriterion])) {
      setNewCriterion('')
      await load()
    }
  }

  async function saveCriterionEdit(criterionId: string) {
    if (!editCriterionName.trim()) return
    if (await act(criterionId, 'updateCriterion', [id, criterionId, editCriterionName])) {
      setEditingCriterion(null)
      await load()
    }
  }

  async function toggleCriterion(criterion: Criterion) {
    if (await act(criterion.id, 'toggleCriterion', [id, criterion.id, !criterion.active])) await load()
  }

  async function addTask() {
    if (!newTaskTitle.trim()) return
    if (await act('new-task', 'createTask', [id, newTaskTitle, newTaskDescription])) {
      setNewTaskTitle('')
      setNewTaskDescription('')
      await load()
    }
  }

  async function saveTaskEdit(taskId: string) {
    if (!editTaskTitle.trim()) return
    if (await act(taskId, 'updateTask', [id, taskId, editTaskTitle, editTaskDescription])) {
      setEditingTask(null)
      await load()
    }
  }

  async function toggleTask(task: Task) {
    if (await act(task.id, 'toggleTask', [id, task.id, !task.active])) await load()
  }

  async function archiveTask(task: Task) {
    if (await act(`archive-${task.id}`, 'archiveTask', [id, task.id, !task.archived])) await load()
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
  const visibleTasks = config.tasks.filter((t) => !t.archived)
  const archivedTasks = config.tasks.filter((t) => t.archived)

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Avaliação de membros' }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: 16 + headerInset }]}>
        {message && <Text style={styles.notice}>{message}</Text>}
        <Text style={styles.hint}>Visível só para dono e gestores do grupo. Ninguém mais vê estas notas.</Text>

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
                  <Text style={styles.memberName}>{name}</Text>
                  <Text style={styles.memberDetail}>
                    {m.rating_count} {m.rating_count === 1 ? 'nota' : 'notas'} · {m.task_count} {m.task_count === 1 ? 'missão' : 'missões'}
                  </Text>
                </View>
                {m.average !== null ? <Text style={styles.memberScore}>{m.average.toFixed(1)}</Text> : <Text style={styles.empty}>Sem notas</Text>}
              </Pressable>
            )
          })}
        </Section>

        <Section title="Critérios de avaliação">
          {config.criteria.length === 0 && <Text style={styles.empty}>Nenhum critério criado ainda.</Text>}
          {config.criteria.map((c) =>
            editingCriterion === c.id ? (
              <View key={c.id} style={styles.editRow}>
                <Field label="Nome" value={editCriterionName} onChangeText={setEditCriterionName} autoFocus maxLength={60} />
                <View style={styles.rowGap}>
                  <TextButton label={busy === c.id ? '...' : 'Salvar'} onPress={() => saveCriterionEdit(c.id)} disabled={busy === c.id} />
                  <TextButton label="Cancelar" onPress={() => setEditingCriterion(null)} muted />
                </View>
              </View>
            ) : (
              <View key={c.id} style={styles.itemRow}>
                <Text style={[styles.itemText, !c.active && styles.itemInactive]}>{c.name}</Text>
                {isOwner && (
                  <View style={styles.rowGap}>
                    <TextButton
                      label="Editar"
                      onPress={() => {
                        setEditingCriterion(c.id)
                        setEditCriterionName(c.name)
                      }}
                      muted
                    />
                    <TextButton label={busy === c.id ? '...' : c.active ? 'Ativo' : 'Inativo'} onPress={() => toggleCriterion(c)} disabled={busy === c.id} />
                  </View>
                )}
              </View>
            )
          )}
          {isOwner && (
            <View style={styles.addForm}>
              <Field label="Novo critério" placeholder="Ex.: Pontualidade" value={newCriterion} onChangeText={setNewCriterion} maxLength={60} />
              <TextButton label={busy === 'new-criterion' ? 'Adicionando...' : 'Adicionar'} onPress={addCriterion} disabled={busy === 'new-criterion' || !newCriterion.trim()} />
            </View>
          )}
        </Section>

        <Section title="Mini-missões">
          {visibleTasks.length === 0 && <Text style={styles.empty}>Nenhuma mini-missão criada ainda.</Text>}
          {visibleTasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              busy={busy}
              editing={editingTask === t.id}
              editTitle={editTaskTitle}
              editDescription={editTaskDescription}
              onStartEdit={() => {
                setEditingTask(t.id)
                setEditTaskTitle(t.title)
                setEditTaskDescription(t.description ?? '')
              }}
              onChangeTitle={setEditTaskTitle}
              onChangeDescription={setEditTaskDescription}
              onSave={() => saveTaskEdit(t.id)}
              onCancel={() => setEditingTask(null)}
              onToggle={() => toggleTask(t)}
              onArchive={() => archiveTask(t)}
            />
          ))}
          {archivedTasks.length > 0 && (
            <View>
              <Pressable onPress={() => setShowArchived((v) => !v)} style={styles.archivedToggle}>
                {showArchived ? <ChevronDown size={14} color={colors.text40} /> : <ChevronRight size={14} color={colors.text40} />}
                <Text style={styles.archivedToggleText}>Arquivadas ({archivedTasks.length})</Text>
              </Pressable>
              {showArchived &&
                archivedTasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    busy={busy}
                    editing={editingTask === t.id}
                    editTitle={editTaskTitle}
                    editDescription={editTaskDescription}
                    onStartEdit={() => {
                      setEditingTask(t.id)
                      setEditTaskTitle(t.title)
                      setEditTaskDescription(t.description ?? '')
                    }}
                    onChangeTitle={setEditTaskTitle}
                    onChangeDescription={setEditTaskDescription}
                    onSave={() => saveTaskEdit(t.id)}
                    onCancel={() => setEditingTask(null)}
                    onToggle={() => toggleTask(t)}
                    onArchive={() => archiveTask(t)}
                  />
                ))}
            </View>
          )}
          <View style={styles.addForm}>
            <Field label="Título da missão" placeholder="Ex.: Trazer água extra" value={newTaskTitle} onChangeText={setNewTaskTitle} maxLength={80} />
            <Field label="Descrição (opcional)" value={newTaskDescription} onChangeText={setNewTaskDescription} />
            <TextButton label={busy === 'new-task' ? 'Adicionando...' : 'Adicionar'} onPress={addTask} disabled={busy === 'new-task' || !newTaskTitle.trim()} />
          </View>
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

function TaskRow({
  task,
  busy,
  editing,
  editTitle,
  editDescription,
  onStartEdit,
  onChangeTitle,
  onChangeDescription,
  onSave,
  onCancel,
  onToggle,
  onArchive,
}: {
  task: Task
  busy: string | null
  editing: boolean
  editTitle: string
  editDescription: string
  onStartEdit: () => void
  onChangeTitle: (v: string) => void
  onChangeDescription: (v: string) => void
  onSave: () => void
  onCancel: () => void
  onToggle: () => void
  onArchive: () => void
}) {
  if (editing) {
    return (
      <View style={styles.editRow}>
        <Field label="Título" value={editTitle} onChangeText={onChangeTitle} autoFocus maxLength={80} />
        <Field label="Descrição" value={editDescription} onChangeText={onChangeDescription} />
        <View style={styles.rowGap}>
          <TextButton label={busy === task.id ? '...' : 'Salvar'} onPress={onSave} disabled={busy === task.id} />
          <TextButton label="Cancelar" onPress={onCancel} muted />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.taskRow}>
      <View style={styles.flex}>
        <Text style={[styles.itemText, !task.active && styles.itemInactive]}>{task.title}</Text>
        {task.description ? <Text style={styles.memberDetail}>{task.description}</Text> : null}
      </View>
      <View style={styles.rowGapWrap}>
        <TextButton label="Editar" onPress={onStartEdit} muted />
        {!task.archived && (
          <TextButton label={busy === task.id ? '...' : task.active ? 'Ativa' : 'Inativa'} onPress={onToggle} disabled={busy === task.id} />
        )}
        <TextButton label={busy === `archive-${task.id}` ? '...' : task.archived ? 'Desarquivar' : 'Arquivar'} onPress={onArchive} muted disabled={busy === `archive-${task.id}`} />
      </View>
    </View>
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
  memberName: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  memberDetail: { fontFamily: fonts.body, fontSize: 11, color: colors.text40 },
  memberScore: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.primary },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 6 },
  itemText: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text },
  itemInactive: { color: colors.text35, textDecorationLine: 'line-through' },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, paddingVertical: 8 },
  editRow: { gap: 8, paddingVertical: 8 },
  addForm: { gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4 },
  rowGap: { flexDirection: 'row', gap: 8 },
  rowGapWrap: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  archivedToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  archivedToggleText: { fontFamily: fonts.body, fontSize: 12, color: colors.text40 },
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
