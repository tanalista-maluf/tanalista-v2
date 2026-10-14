import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

// Times de um evento, sem nada de transporte: usado pelas server actions do
// site e pela API do app.

export type EventTeam = { id: string; name: string; capacity: number; confirmed_count: number }

// Conta com o service_role: pela RLS cada pessoa só enxerga a própria inscrição
export async function getEventTeams(eventId: string): Promise<EventTeam[]> {
  const admin = createAdminClient()
  const { data: teams } = await admin
    .from('event_teams')
    .select('id, name, capacity, position')
    .eq('event_id', eventId)
    .order('position')

  return Promise.all(
    (teams ?? []).map(async (team) => {
      const { count } = await admin
        .from('participations')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team.id)
        .eq('status', 'CONFIRMED')
      return { id: team.id, name: team.name, capacity: team.capacity, confirmed_count: count ?? 0 }
    })
  )
}

// Time escolhido na inscrição: precisa ser do evento e ter vaga
export async function checkTeamForJoin(eventId: string, teamId: string): Promise<string | null> {
  const team = (await getEventTeams(eventId)).find((t) => t.id === teamId)
  if (!team) return 'Time não encontrado.'
  if (team.confirmed_count >= team.capacity) return 'Este time está lotado. Escolha outro time.'
  return null
}

// Troca de time de quem está confirmado: no máximo 1 troca
export async function changeTeam(
  userId: string,
  participationId: string,
  newTeamId: string
): Promise<{ error: string } | { success: true }> {
  const admin = createAdminClient()

  const { data: participation } = await admin
    .from('participations')
    .select('id, user_id, event_id, status, team_id, team_changes_used')
    .eq('id', participationId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!participation) return { error: 'Participação não encontrada.' }
  if (participation.status !== 'CONFIRMED') {
    return { error: 'Apenas participantes confirmados podem trocar de time aqui.' }
  }
  if (participation.team_changes_used >= 1) {
    return { error: 'Você já utilizou sua troca de time permitida.' }
  }
  if (participation.team_id === newTeamId) return { error: 'Você já está neste time.' }

  const team = (await getEventTeams(participation.event_id)).find((t) => t.id === newTeamId)
  if (!team) return { error: 'Time não encontrado.' }
  if (team.confirmed_count >= team.capacity) {
    return { error: 'Este time está lotado. Você pode entrar na fila de espera do time.' }
  }

  await admin
    .from('participations')
    .update({ team_id: newTeamId, team_changes_used: 1 })
    .eq('id', participationId)

  revalidatePath(`/eventos/${participation.event_id}`)
  return { success: true }
}
