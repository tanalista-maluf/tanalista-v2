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

// ── Critérios de avaliação ───────────────────────────────────────────────

export async function createCriterionAction(groupId: string, name: string) {
  const auth = await requireOwner(groupId)
  if (!auth.ok) return auth

  const trimmed = name.trim()
  if (trimmed.length < 2 || trimmed.length > 60) return { error: 'Nome deve ter de 2 a 60 caracteres.' }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('group_rating_criteria')
    .insert({ group_id: groupId, name: trimmed, created_by: auth.user.id })
    .select('id, name, active')
    .single()
  if (error || !data) return { error: 'Erro ao criar critério.' }
  return { success: true, criterion: data }
}

export async function toggleCriterionAction(groupId: string, criterionId: string, active: boolean) {
  const auth = await requireOwner(groupId)
  if (!auth.ok) return auth

  const admin = createAdminClient()
  const { error } = await admin
    .from('group_rating_criteria')
    .update({ active })
    .eq('id', criterionId)
    .eq('group_id', groupId)
  if (error) return { error: 'Erro ao atualizar critério.' }
  return { success: true }
}

// ── Notas por critério ───────────────────────────────────────────────────
// Upsert: um gestor tem no máximo uma nota vigente por critério+membro.

export async function rateMemberAction(groupId: string, criterionId: string, memberId: string, score: number) {
  const auth = await requireManager(groupId)
  if (!auth.ok) return auth

  if (!Number.isInteger(score) || score < 0 || score > 10) return { error: 'Nota deve ser de 0 a 10.' }

  const admin = createAdminClient()
  const { error } = await admin.from('group_rating_scores').upsert(
    {
      group_id: groupId,
      criterion_id: criterionId,
      member_id: memberId,
      rated_by: auth.user.id,
      score,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'criterion_id,member_id,rated_by' }
  )
  if (error) return { error: 'Erro ao salvar nota.' }
  return { success: true }
}

// ── Mini-missões ─────────────────────────────────────────────────────────
// Cumprimento pode repetir: cada marcação é uma linha própria, valendo
// outra nota 10 na média do membro.

export async function createTaskAction(groupId: string, title: string, description: string) {
  const auth = await requireManager(groupId)
  if (!auth.ok) return auth

  const trimmedTitle = title.trim()
  if (trimmedTitle.length < 2 || trimmedTitle.length > 80) return { error: 'Título deve ter de 2 a 80 caracteres.' }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('group_tasks')
    .insert({ group_id: groupId, title: trimmedTitle, description: description.trim() || null, created_by: auth.user.id })
    .select('id, title, description, active')
    .single()
  if (error || !data) return { error: 'Erro ao criar missão.' }
  return { success: true, task: data }
}

export async function toggleTaskAction(groupId: string, taskId: string, active: boolean) {
  const auth = await requireManager(groupId)
  if (!auth.ok) return auth

  const admin = createAdminClient()
  const { error } = await admin.from('group_tasks').update({ active }).eq('id', taskId).eq('group_id', groupId)
  if (error) return { error: 'Erro ao atualizar missão.' }
  return { success: true }
}

export async function completeTaskAction(groupId: string, taskId: string, memberId: string) {
  const auth = await requireManager(groupId)
  if (!auth.ok) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('group_task_completions')
    .insert({ group_id: groupId, task_id: taskId, member_id: memberId, marked_by: auth.user.id })
    .select('id, completed_at')
    .single()
  if (error || !data) return { error: 'Erro ao marcar cumprimento.' }
  return { success: true, completion: data }
}

export async function undoTaskCompletionAction(groupId: string, completionId: string) {
  const auth = await requireManager(groupId)
  if (!auth.ok) return auth

  const admin = createAdminClient()
  const { error } = await admin
    .from('group_task_completions')
    .delete()
    .eq('id', completionId)
    .eq('group_id', groupId)
  if (error) return { error: 'Erro ao desfazer cumprimento.' }
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
