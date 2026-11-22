import { revalidatePath } from 'next/cache'
import { createNotificationAdmin } from '@/features/notificacoes/actions'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPhotoUploadEnabled } from '@/features/galeria/photos'
import { getEventPolls } from '@/features/mural/queries-polls'
import type { Database } from '@/types/database'

// O que as pessoas fazem em torno de um evento além de se inscrever: mural,
// enquetes, fotos, avaliação, denúncia e pedido de entrada. Sem nada de
// transporte: usado pelas server actions do site (sessão em cookie) e pela API
// do app (token Bearer).

type UserClient = SupabaseClient<Database>
type Result = { error: string } | { success: true }

// ── Mural ────────────────────────────────────────────────────────────────────

// A RLS de event_comments decide quem publica: organizador e inscritos confirmados
export async function postComment(supabase: UserClient, userId: string, eventId: string, content: string): Promise<Result> {
  const trimmed = content.trim()
  if (!trimmed || trimmed.length > 500) return { error: 'Mensagem inválida' }

  const { error } = await supabase
    .from('event_comments')
    .insert({ event_id: eventId, user_id: userId, content: trimmed })

  if (error) return { error: 'Erro ao publicar mensagem' }

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}

// A RLS só deixa apagar a própria mensagem, ou qualquer uma se for o organizador
export async function deleteComment(supabase: UserClient, commentId: string): Promise<Result> {
  const { data, error } = await supabase
    .from('event_comments')
    .delete()
    .eq('id', commentId)
    .select('event_id')

  if (error) return { error: 'Erro ao deletar mensagem' }
  if (data?.[0]) revalidatePath(`/eventos/${data[0].event_id}`)
  return { success: true }
}

export async function votePoll(supabase: UserClient, userId: string, pollId: string, optionId: string): Promise<Result> {
  const { error } = await supabase
    .from('event_poll_votes')
    .insert({ poll_id: pollId, option_id: optionId, user_id: userId })

  if (error?.code === '23505') return { error: 'Você já votou nesta enquete' }
  if (error) return { error: 'Erro ao registrar voto' }
  return { success: true }
}

// ── Avaliação ────────────────────────────────────────────────────────────────

export async function submitRating(userId: string, eventId: string, rating: number, comment: string): Promise<Result> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'Avaliação inválida' }

  const admin = createAdminClient()

  const { data: participation } = await admin
    .from('participations')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .eq('status', 'CONFIRMED')
    .maybeSingle()

  if (!participation) return { error: 'Apenas participantes confirmados podem avaliar' }

  const { data: event } = await admin
    .from('events')
    .select('status')
    .eq('id', eventId)
    .single()

  if (!event || event.status !== 'COMPLETED') return { error: 'O evento precisa ter terminado para ser avaliado' }

  const { error } = await admin
    .from('event_ratings')
    .upsert({
      event_id: eventId,
      user_id: userId,
      rating,
      comment: comment.trim() || null,
    }, { onConflict: 'event_id,user_id' })

  if (error) return { error: 'Erro ao salvar avaliação.' }

  // rating_average e rating_count são mantidos pelo trigger trg_event_rating_stats

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}

// ── Denúncia ─────────────────────────────────────────────────────────────────

export const REPORT_REASONS = ['SPAM', 'INAPPROPRIATE', 'FAKE', 'DANGEROUS', 'OTHER'] as const

export async function submitReport(
  supabase: UserClient,
  userId: string,
  targetType: 'EVENT' | 'GROUP',
  targetId: string,
  reason: string,
  description: string
): Promise<Result> {
  const { error } = await supabase
    .from('reports')
    .upsert(
      { reporter_id: userId, target_type: targetType, target_id: targetId, reason, description: description.trim() || null },
      { onConflict: 'reporter_id,target_type,target_id' }
    )

  if (error) {
    if (error.code === '23505') return { error: 'Você já enviou uma denúncia sobre este conteúdo.' }
    return { error: 'Erro ao enviar denúncia.' }
  }

  return { success: true }
}

// ── Pedido de entrada em evento privado ──────────────────────────────────────

export async function requestEventJoin(userId: string, eventId: string): Promise<Result> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('event_join_requests')
    .upsert({ event_id: eventId, user_id: userId, status: 'PENDING', updated_at: new Date().toISOString() }, { onConflict: 'event_id,user_id' })

  if (error) return { error: 'Erro ao enviar solicitação.' }

  // Avisa o organizador
  const { data: event } = await admin
    .from('events')
    .select('organizer_id, title, slug')
    .eq('id', eventId)
    .maybeSingle()

  const { data: requester } = await admin
    .from('profiles')
    .select('full_name, username')
    .eq('id', userId)
    .maybeSingle()

  if (event?.organizer_id) {
    const requesterName = requester?.full_name ?? requester?.username ?? 'Alguém'
    await createNotificationAdmin({
      userId: event.organizer_id,
      type: 'EVENT_JOIN_REQUEST',
      title: 'Solicitação de participação',
      body: `${requesterName} quer participar de "${event.title}".`,
      data: { event_id: eventId, event_slug: event.slug, requester_id: userId },
    })
  }

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}

// ── Leitura para o app ───────────────────────────────────────────────────────

const PERSON = 'full_name, username, avatar_url'

// Tudo o que a página do evento no app mostra além dos dados do próprio
// evento. Participantes e avaliações são de todos; mural, enquetes e fotos, só
// do organizador e dos inscritos confirmados, como no site.
export async function getEventExtras(supabase: UserClient, userId: string, eventId: string) {
  // Só de evento que a pessoa enxerga
  const { data: event } = await supabase
    .from('events')
    .select('id, organizer_id, visibility')
    .eq('id', eventId)
    .maybeSingle()

  if (!event) return null

  const admin = createAdminClient()

  const [{ data: participants }, { data: ratings }, { data: mine }, { data: joinRequest }] = await Promise.all([
    admin
      .from('participations')
      .select(`id, status, user_id, team_id, profiles(${PERSON})`)
      .eq('event_id', eventId)
      .in('status', ['CONFIRMED', 'PENDING'])
      .order('created_at', { ascending: true }),
    admin
      .from('event_ratings')
      .select(`rating, comment, created_at, user_id, profiles(${PERSON})`)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false }),
    admin
      .from('participations')
      .select('id, status, checked_in_at')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle(),
    admin
      .from('event_join_requests')
      .select('status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const isOrganizer = event.organizer_id === userId
  const isMember = isOrganizer || mine?.status === 'CONFIRMED'

  const [comments, polls, photos] = isMember
    ? await Promise.all([
        admin
          .from('event_comments')
          .select(`id, content, created_at, user_id, profiles(${PERSON})`)
          .eq('event_id', eventId)
          .order('created_at', { ascending: true })
          .limit(200)
          .then(({ data }) => data ?? []),
        getEventPolls(eventId, userId),
        admin
          .from('event_photos')
          .select(`id, storage_path, created_at, user_id, profiles(${PERSON})`)
          .eq('event_id', eventId)
          .order('created_at', { ascending: false })
          .then(({ data }) => data ?? []),
      ])
    : [[], [], []]

  const scores = (ratings ?? []).map((row) => row.rating)

  return {
    isOrganizer,
    // Organizador e inscritos confirmados: mural, enquetes e fotos
    isMember,
    participants: (participants ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      team_id: row.team_id,
      profile: row.profiles,
    })),
    comments: comments.map((row) => ({
      id: row.id,
      content: row.content,
      created_at: row.created_at,
      // Só a própria mensagem (ou qualquer uma, para o organizador) pode ser apagada
      canDelete: isOrganizer || row.user_id === userId,
      profile: row.profiles,
    })),
    polls,
    photos: photos.map((row) => ({
      id: row.id,
      url: row.storage_path,
      created_at: row.created_at,
      profile: row.profiles,
      // Quem enviou e o organizador podem apagar
      canDelete: row.user_id === userId || isOrganizer,
    })),
    ratings: {
      average: scores.length ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10 : 0,
      count: scores.length,
      items: (ratings ?? []).map((row) => ({
        rating: row.rating,
        comment: row.comment,
        created_at: row.created_at,
        profile: row.profiles,
      })),
      mine: (ratings ?? []).find((row) => row.user_id === userId)?.rating ?? null,
    },
    photoUpload: isMember && isPhotoUploadEnabled(),
    checkedInAt: mine?.checked_in_at ?? null,
    // Pedido de entrada em evento privado: PENDING, APPROVED, REJECTED ou nenhum
    joinRequest: joinRequest?.status ?? null,
  }
}
