'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { User } from '@supabase/supabase-js'
import { isGroupManager } from '@/features/grupos/roles'

type ManagerAuth = { ok: true; user: User; role: string } | { ok: false; error: string }

async function requireManager(groupId: string): Promise<ManagerAuth> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Não autenticado.' }

  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!isGroupManager(membership?.role)) return { ok: false, error: 'Apenas dono ou gestores do grupo.' }
  return { ok: true, user, role: membership!.role }
}

async function requireOwner(groupId: string): Promise<ManagerAuth> {
  const auth = await requireManager(groupId)
  if (!auth.ok) return auth
  if (auth.role !== 'OWNER') return { ok: false, error: 'Apenas o dono do grupo.' }
  return auth
}

// ── Faltas ────────────────────────────────────────────────────────────────
// Dono ou gestor registra o tipo (gravidade) e a justificativa. Sem edição
// — só criar e apagar (corrigir um lançamento errado), pra manter o
// histórico simples.

const INCIDENT_SEVERITIES = ['LEVE', 'MEDIA', 'GRAVE'] as const
type IncidentSeverity = typeof INCIDENT_SEVERITIES[number]

export async function createIncidentAction(groupId: string, memberId: string, severity: string, description: string) {
  const auth = await requireManager(groupId)
  if (!auth.ok) return auth

  if (!INCIDENT_SEVERITIES.includes(severity as IncidentSeverity)) return { error: 'Gravidade inválida.' }
  const trimmed = description.trim()
  if (trimmed.length < 3 || trimmed.length > 500) return { error: 'Justificativa deve ter de 3 a 500 caracteres.' }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('group_member_incidents')
    .insert({ group_id: groupId, member_id: memberId, severity: severity as IncidentSeverity, description: trimmed, created_by: auth.user.id })
    .select('id, severity, description, created_at')
    .single()
  if (error || !data) return { error: 'Erro ao registrar falta.' }
  return { success: true, incident: data }
}

export async function deleteIncidentAction(groupId: string, incidentId: string) {
  const auth = await requireManager(groupId)
  if (!auth.ok) return auth

  const admin = createAdminClient()
  const { error } = await admin
    .from('group_member_incidents')
    .delete()
    .eq('id', incidentId)
    .eq('group_id', groupId)
  if (error) return { error: 'Erro ao excluir falta.' }
  return { success: true }
}

// ── Contribuições ─────────────────────────────────────────────────────────

const CONTRIBUTION_SIZES = ['PEQUENA', 'MEDIA', 'GRANDE'] as const
type ContributionSize = typeof CONTRIBUTION_SIZES[number]

export async function createContributionAction(groupId: string, memberId: string, size: string, description: string) {
  const auth = await requireManager(groupId)
  if (!auth.ok) return auth

  if (!CONTRIBUTION_SIZES.includes(size as ContributionSize)) return { error: 'Porte inválido.' }
  const trimmed = description.trim()
  if (trimmed.length < 3 || trimmed.length > 500) return { error: 'Justificativa deve ter de 3 a 500 caracteres.' }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('group_member_contributions')
    .insert({ group_id: groupId, member_id: memberId, size: size as ContributionSize, description: trimmed, created_by: auth.user.id })
    .select('id, size, description, created_at')
    .single()
  if (error || !data) return { error: 'Erro ao registrar contribuição.' }
  return { success: true, contribution: data }
}

export async function deleteContributionAction(groupId: string, contributionId: string) {
  const auth = await requireManager(groupId)
  if (!auth.ok) return auth

  const admin = createAdminClient()
  const { error } = await admin
    .from('group_member_contributions')
    .delete()
    .eq('id', contributionId)
    .eq('group_id', groupId)
  if (error) return { error: 'Erro ao excluir contribuição.' }
  return { success: true }
}

// ── Campos customizados (ex.: velocidade de cronagem) ───────────────────

export async function createMemberFieldAction(groupId: string, label: string, unit: string) {
  const auth = await requireOwner(groupId)
  if (!auth.ok) return auth

  const trimmed = label.trim()
  if (trimmed.length < 2 || trimmed.length > 60) return { error: 'Nome deve ter de 2 a 60 caracteres.' }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('group_member_fields')
    .insert({ group_id: groupId, label: trimmed, unit: unit.trim() || null, created_by: auth.user.id })
    .select('id, label, unit, active')
    .single()
  if (error || !data) return { error: 'Erro ao criar campo.' }
  return { success: true, field: data }
}

export async function toggleMemberFieldAction(groupId: string, fieldId: string, active: boolean) {
  const auth = await requireOwner(groupId)
  if (!auth.ok) return auth

  const admin = createAdminClient()
  const { error } = await admin
    .from('group_member_fields')
    .update({ active })
    .eq('id', fieldId)
    .eq('group_id', groupId)
  if (error) return { error: 'Erro ao atualizar campo.' }
  return { success: true }
}

export async function addMemberFieldEntryAction(
  groupId: string,
  fieldId: string,
  memberId: string,
  value: string,
  recordedAt: string
) {
  const auth = await requireManager(groupId)
  if (!auth.ok) return auth

  const trimmedValue = value.trim()
  if (!trimmedValue) return { error: 'Informe o valor.' }
  if (!recordedAt) return { error: 'Informe a data.' }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('group_member_field_entries')
    .insert({ group_id: groupId, field_id: fieldId, member_id: memberId, value: trimmedValue, recorded_at: recordedAt, recorded_by: auth.user.id })
    .select('id, value, recorded_at')
    .single()
  if (error || !data) return { error: 'Erro ao salvar registro.' }
  return { success: true, entry: data }
}

export async function deleteMemberFieldEntryAction(groupId: string, entryId: string) {
  const auth = await requireManager(groupId)
  if (!auth.ok) return auth

  const admin = createAdminClient()
  const { error } = await admin
    .from('group_member_field_entries')
    .delete()
    .eq('id', entryId)
    .eq('group_id', groupId)
  if (error) return { error: 'Erro ao excluir registro.' }
  return { success: true }
}
