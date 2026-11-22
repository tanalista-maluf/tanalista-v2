import { createAdminClient } from '@/lib/supabase/admin'

const PUB_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getPublicGroup(slugOrId: string) {
  const admin = createAdminClient()
  const isUUID = PUB_UUID_RE.test(slugOrId)

  const { data: group, error } = await admin
    .from('groups')
    .select('id, slug, name, description, city, category, avatar_url, visibility, member_count, created_at')
    .eq(isUUID ? 'id' : 'slug', slugOrId)
    .maybeSingle()

  if (!group || error) return null

  const { data: events } = await admin
    .from('events')
    .select('id, slug, title, starts_at, price, cover_url')
    .eq('group_id', group.id)
    .in('status', ['OPEN', 'CONFIRMED', 'PENDING'])
    .order('starts_at', { ascending: true })
    .limit(5)

  return { ...group, upcoming_events: events ?? [] }
}

export type PublicGroup = NonNullable<Awaited<ReturnType<typeof getPublicGroup>>>

// Página de um grupo para quem ainda não é membro, no app: os dados públicos e
// a situação da pessoa (membro, pedido pendente ou nada). O grupo privado não
// aparece pela RLS para quem está de fora; por isso a leitura é do servidor.
export async function getGroupPreview(slugOrId: string, userId: string) {
  const group = await getPublicGroup(slugOrId)
  if (!group) return null

  const admin = createAdminClient()
  const [{ data: member }, { data: request }] = await Promise.all([
    admin.from('group_members').select('id').eq('group_id', group.id).eq('user_id', userId).maybeSingle(),
    admin
      .from('group_join_requests')
      .select('status')
      .eq('group_id', group.id)
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  return {
    group: {
      id: group.id,
      slug: group.slug,
      name: group.name,
      description: group.description,
      city: group.city,
      category: group.category,
      avatar_url: group.avatar_url,
      visibility: group.visibility,
      member_count: group.member_count,
    },
    status: member ? ('MEMBER' as const) : request?.status === 'PENDING' ? ('REQUESTED' as const) : ('NONE' as const),
  }
}
