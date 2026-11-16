import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Quem edita e cancela o evento: quem o criou e, em evento de grupo, o dono
// do grupo. Gestores e demais membros só mexem nos próprios eventos.
export async function canEditEvent(
  supabase: SupabaseClient<Database>,
  event: { organizer_id: string; group_id: string | null },
  userId: string
): Promise<boolean> {
  if (event.organizer_id === userId) return true
  return isGroupOwner(supabase, event.group_id, userId)
}

export async function isGroupOwner(
  supabase: SupabaseClient<Database>,
  groupId: string | null,
  userId: string
): Promise<boolean> {
  if (!groupId) return false
  const { data } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()
  return data?.role === 'OWNER'
}

// Check-in na entrada do evento: além de quem organiza, qualquer dono ou
// gestor do grupo do evento também pode — na prática, mais gente com o
// celular na mão fazendo check-in ao mesmo tempo, sem depender só do
// organizador estar presente.
export async function canCheckInEvent(
  supabase: SupabaseClient<Database>,
  event: { organizer_id: string; group_id: string | null },
  userId: string
): Promise<boolean> {
  if (event.organizer_id === userId) return true
  if (!event.group_id) return false
  const { data } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', event.group_id)
    .eq('user_id', userId)
    .maybeSingle()
  return data?.role === 'OWNER' || data?.role === 'MANAGER'
}
