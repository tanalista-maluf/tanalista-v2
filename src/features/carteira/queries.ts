import { createClient } from '@/lib/supabase/server'

export async function getWalletData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', user.id)
    .single()

  return { balance: profile?.wallet_balance ?? 0 }
}

export async function getWalletTransactions(limit = 20, cursor?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { items: [], nextCursor: null }

  let query = supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)

  if (cursor) {
    const [ts, id] = cursor.split('_')
    query = query.or(`created_at.lt.${ts},and(created_at.eq.${ts},id.lt.${id})`)
  }

  const { data } = await query
  if (!data) return { items: [], nextCursor: null }

  const hasMore = data.length > limit
  const items = hasMore ? data.slice(0, limit) : data
  const last = items[items.length - 1]
  const nextCursor = hasMore && last ? `${last.created_at}_${last.id}` : null

  return { items, nextCursor }
}
