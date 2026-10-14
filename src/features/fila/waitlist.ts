import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateFees } from '@/lib/mercadopago'
import { releaseCouponUse } from '@/lib/refunds'
import { canJoinPrivateEvent, type JoinMethod } from '@/features/participacoes/join-event'
import type { Database } from '@/types/database'

// Regras da fila de espera, sem nada de transporte: são chamadas pelas server
// actions do site (sessão em cookie) e pela API do app (token Bearer). Recebem
// o cliente Supabase já autenticado como o usuário e devolvem o que aconteceu;
// quem chama decide para onde ir.

type UserClient = SupabaseClient<Database>

export type JoinWaitlistResult = { error: string } | { success: true; position: number }

export async function joinWaitlist(
  supabase: UserClient,
  userId: string,
  eventId: string,
  teamId?: string
): Promise<JoinWaitlistResult> {
  const { data: event } = await supabase
    .from('events')
    .select('status, organizer_id, visibility')
    .eq('id', eventId)
    .single()

  if (!event || event.status !== 'OPEN') return { error: 'Inscrições encerradas.' }
  if (!(await canJoinPrivateEvent(event, eventId, userId))) {
    return { error: 'Este evento é privado. Solicite a entrada ao organizador.' }
  }

  const admin = createAdminClient()

  if (teamId && !(await teamBelongsToEvent(teamId, eventId))) return { error: 'Time não encontrado.' }

  // Verificar se já está na fila. Cada pessoa tem uma única linha por evento
  // (unique), então uma entrada antiga EXPIRED/CONFIRMED é reaproveitada.
  const { data: existingEntry } = await admin
    .from('waitlist_entries')
    .select('id, status')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existingEntry && ['WAITING', 'NOTIFIED'].includes(existingEntry.status)) {
    return { error: 'Você já está na fila de espera.' }
  }

  // Próxima posição: depois da maior já usada no evento. Contar só os ativos
  // repetia posições de entradas antigas, e (event_id, position) é unique.
  const { data: last } = await admin
    .from('waitlist_entries')
    .select('position')
    .eq('event_id', eventId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const position = (last?.position ?? 0) + 1
  const entry = {
    position,
    status: 'WAITING' as const,
    notified_at: null,
    expires_at: null,
    team_id: teamId ?? null,
  }

  const { error } = existingEntry
    ? await admin.from('waitlist_entries').update(entry).eq('id', existingEntry.id)
    : await admin.from('waitlist_entries').insert({ event_id: eventId, user_id: userId, ...entry })

  if (error) return { error: 'Erro ao entrar na fila.' }

  revalidatePath(`/eventos/${eventId}`)
  return { success: true, position }
}

export async function leaveWaitlist(
  supabase: UserClient,
  userId: string,
  eventId: string
): Promise<{ error: string } | { success: true }> {
  const { data: entry } = await supabase
    .from('waitlist_entries')
    .select('id, position, status')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .in('status', ['WAITING', 'NOTIFIED'])
    .maybeSingle()

  if (!entry) return { error: 'Você não está na fila deste evento.' }

  // A entrada é apagada: o enum da fila não tem um status de desistência, e a
  // linha ocuparia as unicidades (evento, usuário) e (evento, posição).
  const admin = createAdminClient()
  const { error } = await admin
    .from('waitlist_entries')
    .delete()
    .eq('id', entry.id)

  if (error) return { error: 'Erro ao sair da fila.' }

  // Quem sai já notificado estava segurando a vaga liberada: passa para o próximo
  if (entry.status === 'NOTIFIED') {
    await admin.rpc('promote_waitlist_next', { p_event_id: eventId })
  }

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}

export type ConfirmSpotResult =
  | { error: string; code?: 'INSUFFICIENT_BALANCE' }
  | { status: 'CONFIRMED' }
  | { status: 'PENDING'; participationId: string }

// Confirmar inscrição a partir da fila (entrada está NOTIFIED)
export async function confirmWaitlistSpot(
  supabase: UserClient,
  userId: string,
  eventId: string,
  method: JoinMethod
): Promise<ConfirmSpotResult> {
  const admin = createAdminClient()

  // Verificar entrada na fila
  const { data: entry } = await supabase
    .from('waitlist_entries')
    .select('id, status, expires_at, team_id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .eq('status', 'NOTIFIED')
    .maybeSingle()

  if (!entry) return { error: 'Você não tem uma vaga reservada neste evento.' }

  if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
    return { error: 'Sua reserva expirou. Você foi removido da fila.' }
  }

  // Pode já existir uma participação CANCELLED de uma inscrição anterior
  const { data: existing } = await admin
    .from('participations')
    .select('id, coupon_id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle()

  const { data: event } = await supabase
    .from('events')
    .select('price, organizer_id, organizer_exempt, status')
    .eq('id', eventId)
    .single()

  if (!event || event.status !== 'OPEN') return { error: 'Evento não disponível.' }

  const isExempt = event.organizer_id === userId && event.organizer_exempt

  // A linha de participations é reaproveitada; não herda cupom da inscrição
  // anterior, e o uso que ela ainda segurar é devolvido. O time é o da fila.
  const fresh = { discount_cents: 0, coupon_id: null, team_id: entry.team_id }
  if (existing?.coupon_id) {
    await releaseCouponUse(admin, { couponId: existing.coupon_id, userId, eventId })
  }

  async function saveParticipation(status: 'CONFIRMED' | 'PENDING') {
    const { data } = existing
      ? await admin.from('participations').update({ status, ...fresh }).eq('id', existing.id).select('id').single()
      : await admin
          .from('participations')
          .insert({ event_id: eventId, user_id: userId, status, ...fresh })
          .select('id')
          .single()
    return data?.id
  }

  if (isExempt || event.price === 0) {
    await saveParticipation('CONFIRMED')
    await admin.from('waitlist_entries').update({ status: 'CONFIRMED' }).eq('id', entry.id)
    revalidatePath(`/eventos/${eventId}`)
    return { status: 'CONFIRMED' }
  }

  if (method === 'WALLET') {
    const { data: profile } = await admin
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single()

    if (!profile || profile.wallet_balance < event.price) {
      return { error: 'Saldo insuficiente na carteira.', code: 'INSUFFICIENT_BALANCE' }
    }

    const { error: debitError } = await admin.rpc('wallet_debit', {
      p_user_id: userId,
      p_amount: event.price,
      p_type: 'PAYMENT',
      p_description: 'Inscrição via fila de espera',
      p_event_id: eventId,
    })

    if (debitError) return { error: 'Erro ao processar pagamento pela carteira.' }

    const walletParticipationId = await saveParticipation('CONFIRMED')
    await admin.from('waitlist_entries').update({ status: 'CONFIRMED' }).eq('id', entry.id)

    // Registrar pagamento na tabela payments: é o que entra no repasse ao
    // organizador e o que é devolvido se a inscrição for cancelada
    if (walletParticipationId) {
      const fees = calculateFees(event.price, 'WALLET')
      await admin.from('payments').insert({
        participation_id: walletParticipationId,
        payer_id: userId,
        amount: event.price,
        platform_fee: fees.platform_fee,
        gateway_fee: fees.gateway_fee,
        method: 'WALLET',
        status: 'APPROVED',
      })
    }

    revalidatePath(`/eventos/${eventId}`)
    return { status: 'CONFIRMED' }
  }

  // PIX ou cartão: criar/atualizar participação PENDING
  const participationId = await saveParticipation('PENDING')
  if (!participationId) return { error: 'Erro ao criar inscrição.' }

  // Marcar fila como CONFIRMED (o pagamento ainda não foi feito, mas a vaga foi reservada)
  await admin.from('waitlist_entries').update({ status: 'CONFIRMED' }).eq('id', entry.id)

  revalidatePath(`/eventos/${eventId}`)
  return { status: 'PENDING', participationId }
}

// Troca de fila de espera entre times (ilimitado)
export async function changeWaitlistTeam(
  userId: string,
  waitlistId: string,
  newTeamId: string
): Promise<{ error: string } | { success: true }> {
  const admin = createAdminClient()

  const { data: entry } = await admin
    .from('waitlist_entries')
    .select('id, user_id, event_id, status')
    .eq('id', waitlistId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!entry) return { error: 'Entrada na fila não encontrada.' }
  if (entry.status !== 'WAITING') return { error: 'Só é possível trocar de fila enquanto aguarda.' }
  if (!(await teamBelongsToEvent(newTeamId, entry.event_id))) return { error: 'Time não encontrado.' }

  await admin
    .from('waitlist_entries')
    .update({ team_id: newTeamId })
    .eq('id', waitlistId)

  revalidatePath(`/eventos/${entry.event_id}`)
  return { success: true }
}

async function teamBelongsToEvent(teamId: string, eventId: string) {
  const { data } = await createAdminClient()
    .from('event_teams')
    .select('id')
    .eq('id', teamId)
    .eq('event_id', eventId)
    .maybeSingle()
  return !!data
}
