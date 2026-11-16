import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isGroupManager } from '@/features/grupos/roles'

// A nota final de um membro é a média de todas as notas (de todos os
// critérios, de todos os gestores) mais um 10 para cada cumprimento de
// mini-missão. Calculada em código: o volume por grupo é pequeno, e assim
// evita duplicar a regra num função SQL à parte.
function average(scores: number[]): number | null {
  if (scores.length === 0) return null
  return scores.reduce((sum, s) => sum + s, 0) / scores.length
}

async function currentUserRole(groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()

  return membership ? { userId: user.id, role: membership.role } : null
}

export interface MemberReputationRow {
  member_id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  average: number | null
  rating_count: number
  task_count: number
}

// Painel: todos os membros do grupo com a nota média (null = ninguém
// avaliou ainda, não conta como zero)
export async function getGroupReputationOverview(groupId: string): Promise<MemberReputationRow[] | null> {
  const auth = await currentUserRole(groupId)
  if (!auth || !isGroupManager(auth.role)) return null

  const admin = createAdminClient()
  const [{ data: members }, { data: scores }, { data: completions }] = await Promise.all([
    admin.from('group_members').select('user_id, profiles(full_name, username, avatar_url)').eq('group_id', groupId),
    admin.from('group_rating_scores').select('member_id, score').eq('group_id', groupId),
    admin.from('group_task_completions').select('member_id').eq('group_id', groupId),
  ])

  return (members ?? []).map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    const memberScores = (scores ?? []).filter((s) => s.member_id === m.user_id).map((s) => s.score)
    const taskBonuses = (completions ?? []).filter((c) => c.member_id === m.user_id).map(() => 10)
    return {
      member_id: m.user_id,
      full_name: profile?.full_name ?? null,
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? null,
      average: average([...memberScores, ...taskBonuses]),
      rating_count: memberScores.length,
      task_count: taskBonuses.length,
    }
  })
}

export interface CriterionRow {
  criterion_id: string
  name: string
  active: boolean
  my_score: number | null
  average: number | null
  votes: number
}

export interface TaskCompletionRow {
  id: string
  completed_at: string
  marked_by_name: string | null
}

export interface TaskRow {
  task_id: string
  title: string
  description: string | null
  active: boolean
  archived: boolean
  completions: TaskCompletionRow[]
}

export interface MemberFieldEntryRow {
  id: string
  value: string
  recorded_at: string
  recorded_by_name: string | null
}

export interface MemberFieldRow {
  field_id: string
  label: string
  unit: string | null
  active: boolean
  entries: MemberFieldEntryRow[]
}

export interface MemberReputationDetail {
  member: { full_name: string | null; username: string | null; avatar_url: string | null } | null
  average: number | null
  criteria: CriterionRow[]
  tasks: TaskRow[]
  fields: MemberFieldRow[]
}

// Detalhe de um membro: nota por critério (com a nota do próprio gestor
// logado em destaque, pra ele saber se já votou), mini-missões cumpridas e
// os campos customizados do grupo (ex.: cronagem) com o histórico de datas.
export async function getMemberReputationDetail(groupId: string, memberId: string): Promise<MemberReputationDetail | null> {
  const auth = await currentUserRole(groupId)
  if (!auth || !isGroupManager(auth.role)) return null

  const admin = createAdminClient()
  const [
    { data: memberProfile },
    { data: criteria },
    { data: scores },
    { data: tasks },
    { data: completions },
    { data: fields },
    { data: entries },
  ] = await Promise.all([
    admin.from('profiles').select('full_name, username, avatar_url').eq('id', memberId).maybeSingle(),
    admin.from('group_rating_criteria').select('id, name, active').eq('group_id', groupId).order('created_at'),
    admin.from('group_rating_scores').select('criterion_id, rated_by, score').eq('group_id', groupId).eq('member_id', memberId),
    admin.from('group_tasks').select('id, title, description, active, archived').eq('group_id', groupId).order('created_at'),
    admin.from('group_task_completions').select('id, task_id, completed_at, marked_by').eq('group_id', groupId).eq('member_id', memberId).order('completed_at', { ascending: false }),
    admin.from('group_member_fields').select('id, label, unit, active').eq('group_id', groupId).order('created_at'),
    admin.from('group_member_field_entries').select('id, field_id, value, recorded_at, recorded_by').eq('group_id', groupId).eq('member_id', memberId).order('recorded_at', { ascending: false }),
  ])

  // Um único select de perfis pra quem marcou missões e registrou campos
  const raterIds = [...new Set([...(completions ?? []).map((c) => c.marked_by), ...(entries ?? []).map((e) => e.recorded_by)])]
  const { data: raterProfiles } = raterIds.length > 0
    ? await admin.from('profiles').select('id, full_name, username').in('id', raterIds)
    : { data: [] as { id: string; full_name: string | null; username: string | null }[] }
  const raterName = (id: string) => {
    const p = raterProfiles?.find((r) => r.id === id)
    return p?.full_name ?? p?.username ?? null
  }

  const criteriaOut: CriterionRow[] = (criteria ?? []).map((c) => {
    const rows = (scores ?? []).filter((s) => s.criterion_id === c.id)
    const mine = rows.find((s) => s.rated_by === auth.userId)
    return {
      criterion_id: c.id,
      name: c.name,
      active: c.active,
      my_score: mine?.score ?? null,
      average: average(rows.map((r) => r.score)),
      votes: rows.length,
    }
  })

  const tasksOut: TaskRow[] = (tasks ?? []).map((t) => ({
    task_id: t.id,
    title: t.title,
    description: t.description,
    active: t.active,
    archived: t.archived,
    completions: (completions ?? [])
      .filter((c) => c.task_id === t.id)
      .map((c) => ({ id: c.id, completed_at: c.completed_at, marked_by_name: raterName(c.marked_by) })),
  }))

  const fieldsOut: MemberFieldRow[] = (fields ?? []).map((f) => ({
    field_id: f.id,
    label: f.label,
    unit: f.unit,
    active: f.active,
    entries: (entries ?? [])
      .filter((e) => e.field_id === f.id)
      .map((e) => ({ id: e.id, value: e.value, recorded_at: e.recorded_at, recorded_by_name: raterName(e.recorded_by) })),
  }))

  const allScores = [...(scores ?? []).map((s) => s.score), ...(completions ?? []).map(() => 10)]

  return {
    member: memberProfile ?? null,
    average: average(allScores),
    criteria: criteriaOut,
    tasks: tasksOut,
    fields: fieldsOut,
  }
}
