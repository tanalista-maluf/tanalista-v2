import { createClient } from '@/lib/supabase/server'

export async function getUserAuditLogs(limit = 30) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('audit_logs')
    .select('id, action, table_name, created_at, new_data')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data ?? []
}
