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
