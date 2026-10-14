import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'

// Dados do perfil, sem nada de transporte: usado pelas server actions do site
// (sessão em cookie) e pela API do app (token Bearer).

export const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome muito curto.').max(100),
  phone: z
    .string()
    .min(1, 'Informe seu WhatsApp')
    .regex(/^\d{10,11}$/, 'Telefone inválido (DDD + número, sem espaços)'),
  city: z.string().min(2, 'Cidade obrigatória.').max(100),
  bio: z.string().max(500).optional(),
})

export type ProfileInput = z.infer<typeof profileSchema>

// O telefone não é legível pela anon key (GRANT por coluna em profiles): o
// próprio dono lê os dados dele por aqui
export async function getOwnProfile(userId: string) {
  const { data } = await createAdminClient()
    .from('profiles')
    .select('full_name, username, phone, city, bio, avatar_url')
    .eq('id', userId)
    .maybeSingle()
  return data
}

export async function updateProfile(userId: string, input: unknown): Promise<{ error: string } | { success: true }> {
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await createAdminClient()
    .from('profiles')
    .update(parsed.data)
    .eq('id', userId)

  if (error) return { error: 'Erro ao salvar perfil.' }

  revalidatePath('/perfil')
  return { success: true }
}

export async function uploadAvatar(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File | null
): Promise<{ error: string } | { avatarUrl: string }> {
  if (!file || file.size === 0) return { error: 'Nenhum arquivo selecionado.' }
  if (file.size > 2 * 1024 * 1024) return { error: 'Imagem deve ter no máximo 2MB.' }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return { error: 'Formato inválido. Use JPG, PNG ou WebP.' }
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${userId}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: 'Erro ao enviar imagem.' }

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

  // O endereço não muda entre uma foto e outra: o sufixo faz a nova aparecer
  const avatarUrl = `${publicUrl}?t=${Date.now()}`

  await createAdminClient().from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId)

  revalidatePath('/perfil')
  return { avatarUrl }
}

const EVENT_COLUMNS = 'id, title, starts_at, city, price, capacity, confirmed_count, visibility, groups(name)'

// Perfil público de uma pessoa, para o app. Os números contam tudo; as listas
// trazem só eventos e grupos públicos, que qualquer pessoa já pode ver.
export async function getPublicProfile(username: string) {
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, full_name, username, avatar_url, city, created_at, bio')
    .eq('username', username)
    .maybeSingle()

  if (!profile) return null

  const [
    { data: events },
    { data: memberships },
    { count: organized },
    { count: participations },
    { count: groups },
    { data: ratings },
  ] = await Promise.all([
    admin
      .from('events')
      .select(EVENT_COLUMNS)
      .eq('organizer_id', profile.id)
      .eq('visibility', 'PUBLIC')
      .in('status', ['OPEN', 'CONFIRMED', 'COMPLETED'])
      .order('starts_at', { ascending: false })
      .limit(6),
    admin
      .from('group_members')
      .select('groups!inner(id, name, city, category, visibility, avatar_url, member_count)')
      .eq('user_id', profile.id)
      .eq('groups.visibility', 'PUBLIC')
      .limit(6),
    admin
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('organizer_id', profile.id)
      .eq('status', 'COMPLETED'),
    admin
      .from('participations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('status', 'CONFIRMED'),
    admin.from('group_members').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
    admin.from('event_ratings').select('rating, events!inner(organizer_id)').eq('events.organizer_id', profile.id),
  ])

  const scores = (ratings ?? []).map((row) => row.rating).filter((score): score is number => !!score)
  const rating = scores.length ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10 : null

  return {
    profile: {
      full_name: profile.full_name,
      username: profile.username,
      avatar_url: profile.avatar_url,
      city: profile.city,
      bio: profile.bio,
      created_at: profile.created_at,
    },
    stats: { organized: organized ?? 0, participations: participations ?? 0, groups: groups ?? 0, rating },
    events: events ?? [],
    groups: (memberships ?? []).map((row) => row.groups),
  }
}
