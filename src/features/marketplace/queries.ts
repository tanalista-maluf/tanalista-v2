import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type MarketplaceListing = {
  id: string
  group_id: string
  user_id: string
  title: string
  description: string
  type: string
  price: number | null
  price_negotiable: boolean
  payment_methods: string[]
  contact: string | null
  photo_url: string | null
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'DELETED'
  published_at: string | null
  expires_at: string | null
  created_at: string
  profiles: { full_name: string | null; username: string | null; avatar_url: string | null } | null
}

export async function getGroupListings(groupId: string, userId: string) {
  const supabase = await createClient()

  // Anúncios ativos do grupo + rascunhos do próprio usuário
  const { data, error } = await supabase
    .from('marketplace_listings')
    .select('*, profiles(full_name, username, avatar_url)')
    .eq('group_id', groupId)
    .or(`status.eq.ACTIVE,and(status.eq.DRAFT,user_id.eq.${userId})`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as MarketplaceListing[]
}

export async function getUserListingsInGroup(groupId: string, userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('marketplace_listings')
    .select('id, status')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')

  return data ?? []
}

export async function expireOldListings() {
  const admin = createAdminClient()
  const { error } = await admin
    .from('marketplace_listings')
    .update({ status: 'EXPIRED' })
    .eq('status', 'ACTIVE')
    .lt('expires_at', new Date().toISOString())

  return { error }
}
