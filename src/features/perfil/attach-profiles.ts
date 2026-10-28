import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type BasicProfile = { full_name: string | null; username: string | null; avatar_url: string | null }

// Junta o perfil de cada linha pelo user_id. Os pedidos de entrada (de evento
// e de grupo) apontam para auth.users, não para profiles: o embed
// profiles(...) do PostgREST falha nessas tabelas, e a lista vinha vazia.
export async function attachProfiles<T extends { user_id: string }>(
  supabase: SupabaseClient<Database>,
  rows: T[]
): Promise<(T & { profiles: BasicProfile | null })[]> {
  if (rows.length === 0) return []
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url')
    .in('id', [...new Set(rows.map((row) => row.user_id))])
  const byId = new Map((data ?? []).map(({ id, ...profile }) => [id, profile as BasicProfile]))
  return rows.map((row) => ({ ...row, profiles: byId.get(row.user_id) ?? null }))
}
