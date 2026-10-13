import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWaitlistNotified } from '@/lib/emails'
import { refundParticipationPayments, releaseCouponUse } from '@/lib/refunds'
import type { Database } from '@/types/database'

// Regra de cancelamento de inscrição pelo próprio participante, sem nada de
// transporte: é chamada pela server action do site (sessão em cookie) e pela
// API do app (token Bearer), como join-event.ts.

export type CancelParticipationResult =
  | { error: string; code?: 'NOT_ALLOWED' | 'TOO_LATE' }
  | { success: true }

export async function cancelParticipation(
  supabase: SupabaseClient<Database>,
  userId: string,
  participationId: string
): Promise<CancelParticipationResult> {
  // Buscar participação com evento (inclui cancel_before_hours)
  const { data: participation } = await supabase
    .from('participations')
    .select('*, events(id, title, starts_at, price, status, organizer_id, cancel_before_hours, payout_claimed_at)')
    .eq('id', participationId)
    .eq('user_id', userId)
    .single()

  if (!participation) return { error: 'Participação não encontrada.' }

  const event = participation.events
  if (!event) return { error: 'Evento não encontrado.' }

  if (participation.status === 'CANCELLED') return { error: 'Esta inscrição já foi cancelada.' }

  // Verificar política de cancelamento do evento
  const hoursUntilEvent = (new Date(event.starts_at).getTime() - Date.now()) / (1000 * 60 * 60)
  const cancelPolicy = event.cancel_before_hours  // null = não permitido, 0 = sempre, N = N horas antes

  if (event.organizer_id !== userId) {
    if (cancelPolicy === null || cancelPolicy === undefined) {
      return { error: 'Este evento não permite cancelamento pelo participante.', code: 'NOT_ALLOWED' }
    }
    if (cancelPolicy > 0 && hoursUntilEvent < cancelPolicy) {
      return {
        error: `Cancelamentos devem ser feitos com pelo menos ${cancelPolicy}h de antecedência.`,
        code: 'TOO_LATE',
      }
    }
  }

  // Depois do repasse ao organizador, o valor já saiu: estornar pagaria duas vezes
  if (['CANCELLED', 'COMPLETED'].includes(event.status) || event.payout_claimed_at) {
    return { error: 'Este evento não permite cancelamento.' }
  }

  const admin = createAdminClient()

  // Estorno para a carteira do que foi de fato pago (nada, se a inscrição
  // foi gratuita por cupom ou por isenção do organizador). Vem antes de
  // cancelar: se falhar, a inscrição continua como estava e dá para tentar de novo.
  if (participation.status === 'CONFIRMED') {
    const refunded = await refundParticipationPayments(admin, {
      participationId,
      userId,
      eventId: event.id,
      description: 'Estorno de inscrição cancelada',
    })
    if (refunded === null) return { error: 'Erro ao estornar o pagamento. Tente novamente.' }
  }

  // Cancelar participação
  const { error: cancelError } = await admin
    .from('participations')
    .update({ status: 'CANCELLED', discount_cents: 0, coupon_id: null })
    .eq('id', participationId)

  if (cancelError) {
    console.error('[CANCEL] participation update error after refund:', participationId, cancelError)
    return { error: 'Erro ao cancelar inscrição.' }
  }

  // Um PIX ainda pendente desta inscrição carrega o preço com o desconto do
  // cupom que está sendo devolvido; não pode ser reaproveitado numa reinscrição
  await admin
    .from('payments')
    .update({ status: 'CANCELLED' })
    .eq('participation_id', participationId)
    .eq('status', 'PENDING')

  await releaseCouponUse(admin, { couponId: participation.coupon_id, userId, eventId: event.id })

  // Promover próximo da fila e enviar e-mail quando uma vaga confirmada é liberada
  if (participation.status === 'CONFIRMED') {
    await admin.rpc('promote_waitlist_next', { p_event_id: event.id })

    // Buscar quem foi promovido para enviar e-mail
    const { data: promoted } = await admin
      .from('waitlist_entries')
      .select('user_id, expires_at, profiles(full_name)')
      .eq('event_id', event.id)
      .eq('status', 'NOTIFIED')
      .order('notified_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (promoted) {
      const { data: authUser } = await admin.auth.admin.getUserById(promoted.user_id)
      if (authUser?.user?.email) {
        sendWaitlistNotified({
          to: authUser.user.email,
          name: promoted.profiles?.full_name ?? 'Participante',
          eventTitle: event.title,
          eventId: event.id,
          expiresAt: promoted.expires_at ?? '',
        }).catch((e) => console.error('[EMAIL] sendWaitlistNotified:', e))
      }
    }
  }

  revalidatePath(`/eventos/${event.id}`)
  return { success: true }
}
