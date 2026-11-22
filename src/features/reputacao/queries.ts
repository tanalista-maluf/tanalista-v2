import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isGroupManager } from '@/features/grupos/roles'

export type ReputationIndicator = 'positive' | 'negative' | null

// Indicador ao lado do nome do membro: estrela verde se tem mais
// contribuições que faltas, sinal negativo vermelho se o contrário. Empate
// (inclusive 0 a 0) não mostra nada — é contagem de registros, não nota, de
// propósito, pra não reabrir a mesma discussão que a nota 0-10 causava.
function indicatorFor(incidentCount: number, contributionCount: number): ReputationIndicator {
  if (contributionCount > incidentCount) return 'positive'
  if (incidentCount > contributionCount) return 'negative'
  return null
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
  incident_count: number
  contribution_count: number
  indicator: ReputationIndicator
}

// Painel: todos os membros do grupo com a contagem de faltas/contribuições
// e o indicador resultante.
export async function getGroupReputationOverview(groupId: string): Promise<MemberReputationRow[] | null> {
  const auth = await currentUserRole(groupId)
  if (!auth || !isGroupManager(auth.role)) return null

  const admin = createAdminClient()
  const [{ data: members }, { data: incidents }, { data: contributions }] = await Promise.all([
    admin.from('group_members').select('user_id, profiles(full_name, username, avatar_url)').eq('group_id', groupId),
    admin.from('group_member_incidents').select('member_id').eq('group_id', groupId),
    admin.from('group_member_contributions').select('member_id').eq('group_id', groupId),
  ])

  return (members ?? []).map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    const incidentCount = (incidents ?? []).filter((i) => i.member_id === m.user_id).length
    const contributionCount = (contributions ?? []).filter((c) => c.member_id === m.user_id).length
    return {
      member_id: m.user_id,
      full_name: profile?.full_name ?? null,
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? null,
      incident_count: incidentCount,
      contribution_count: contributionCount,
      indicator: indicatorFor(incidentCount, contributionCount),
    }
  })
}

// Indicador de cada membro, pra mostrar junto do nome na lista geral do
// grupo (visível só pra quem está vendo como gestor — a página do grupo
// confere isso antes de chamar). Mapa leve: sem nome/contagem, só o sinal.
export async function getGroupReputationIndicators(groupId: string): Promise<Record<string, ReputationIndicator> | null> {
  const auth = await currentUserRole(groupId)
  if (!auth || !isGroupManager(auth.role)) return null

  const admin = createAdminClient()
  const [{ data: incidents }, { data: contributions }] = await Promise.all([
    admin.from('group_member_incidents').select('member_id').eq('group_id', groupId),
    admin.from('group_member_contributions').select('member_id').eq('group_id', groupId),
  ])

  const counts: Record<string, { i: number; c: number }> = {}
  for (const row of incidents ?? []) {
    counts[row.member_id] ??= { i: 0, c: 0 }
    counts[row.member_id].i++
  }
  for (const row of contributions ?? []) {
    counts[row.member_id] ??= { i: 0, c: 0 }
    counts[row.member_id].c++
  }

  return Object.fromEntries(
    Object.entries(counts).map(([memberId, { i, c }]) => [memberId, indicatorFor(i, c)])
  )
}

export interface GroupReputationConfig {
  fields: { id: string; label: string; unit: string | null; active: boolean }[]
}

// Campos customizados do grupo (ex.: cronagem) — critérios e mini-missões
// não existem mais, não precisam de catálogo configurável.
export async function getGroupReputationConfig(groupId: string): Promise<GroupReputationConfig | null> {
  const auth = await currentUserRole(groupId)
  if (!auth || !isGroupManager(auth.role)) return null

  const admin = createAdminClient()
  const { data: fields } = await admin
    .from('group_member_fields')
    .select('id, label, unit, active')
    .eq('group_id', groupId)
    .order('created_at')

  return { fields: fields ?? [] }
}

export interface IncidentRow {
  id: string
  severity: 'LEVE' | 'MEDIA' | 'GRAVE'
  description: string
  created_at: string
  created_by_name: string | null
}

export interface ContributionRow {
  id: string
  size: 'PEQUENA' | 'MEDIA' | 'GRANDE'
  description: string
  created_at: string
  created_by_name: string | null
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
  incident_count: number
  contribution_count: number
  indicator: ReputationIndicator
  incidents: IncidentRow[]
  contributions: ContributionRow[]
  fields: MemberFieldRow[]
}

// Detalhe de um membro: faltas e contribuições (mais recente primeiro, com
// quem registrou) e os campos customizados do grupo com histórico de datas.
export async function getMemberReputationDetail(groupId: string, memberId: string): Promise<MemberReputationDetail | null> {
  const auth = await currentUserRole(groupId)
  if (!auth || !isGroupManager(auth.role)) return null

  const admin = createAdminClient()
  const [
    { data: memberProfile },
    { data: incidents },
    { data: contributions },
    { data: fields },
    { data: entries },
  ] = await Promise.all([
    admin.from('profiles').select('full_name, username, avatar_url').eq('id', memberId).maybeSingle(),
    admin.from('group_member_incidents').select('id, severity, description, created_at, created_by').eq('group_id', groupId).eq('member_id', memberId).order('created_at', { ascending: false }),
    admin.from('group_member_contributions').select('id, size, description, created_at, created_by').eq('group_id', groupId).eq('member_id', memberId).order('created_at', { ascending: false }),
    admin.from('group_member_fields').select('id, label, unit, active').eq('group_id', groupId).order('created_at'),
    admin.from('group_member_field_entries').select('id, field_id, value, recorded_at, recorded_by').eq('group_id', groupId).eq('member_id', memberId).order('recorded_at', { ascending: false }),
  ])

  // Um único select de perfis pra quem registrou faltas/contribuições/campos
  const raterIds = [...new Set([
    ...(incidents ?? []).map((i) => i.created_by),
    ...(contributions ?? []).map((c) => c.created_by),
    ...(entries ?? []).map((e) => e.recorded_by),
  ])]
  const { data: raterProfiles } = raterIds.length > 0
    ? await admin.from('profiles').select('id, full_name, username').in('id', raterIds)
    : { data: [] as { id: string; full_name: string | null; username: string | null }[] }
  const raterName = (id: string) => {
    const p = raterProfiles?.find((r) => r.id === id)
    return p?.full_name ?? p?.username ?? null
  }

  const incidentsOut: IncidentRow[] = (incidents ?? []).map((i) => ({
    id: i.id,
    severity: i.severity,
    description: i.description,
    created_at: i.created_at,
    created_by_name: raterName(i.created_by),
  }))

  const contributionsOut: ContributionRow[] = (contributions ?? []).map((c) => ({
    id: c.id,
    size: c.size,
    description: c.description,
    created_at: c.created_at,
    created_by_name: raterName(c.created_by),
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

  return {
    member: memberProfile ?? null,
    incident_count: incidentsOut.length,
    contribution_count: contributionsOut.length,
    indicator: indicatorFor(incidentsOut.length, contributionsOut.length),
    incidents: incidentsOut,
    contributions: contributionsOut,
    fields: fieldsOut,
  }
}
