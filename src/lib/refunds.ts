import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

// Estorna para a carteira o que foi efetivamente pago por uma inscrição: a soma
// dos pagamentos APPROVED dela, que passam a REFUNDED. Inscrição gratuita, por
// cupom de 100% ou por isenção do organizador não tem pagamento, então não gera
// crédito.
//
// A regra vive na função refund_participation_payments do banco, que marca os
// pagamentos e credita a carteira na mesma transação; o job 'event-min-check'
// chama a mesma função.
//
// Devolve o valor creditado (0 se nada foi pago) ou null se o estorno falhou:
// quem chama deve parar antes de qualquer passo irreversível.
export async function refundParticipationPayments(
  admin: AdminClient,
  params: { participationId: string; userId: string; eventId: string; description: string }
): Promise<number | null> {
  const { data, error } = await admin.rpc('refund_participation_payments', {
    p_participation_id: params.participationId,
    p_user_id: params.userId,
    p_event_id: params.eventId,
    p_description: params.description,
  })

  if (error) {
    console.error('[REFUND] refund_participation_payments error:', params.participationId, error)
    return null
  }

  return data ?? 0
}

// Devolve o uso do cupom de uma inscrição que deixou de valer, para que a
// pessoa possa usá-lo de novo se voltar a se inscrever. Diz se havia um uso.
// (Função release_coupon_use do banco, também usada pelo job do cron.)
export async function releaseCouponUse(
  admin: AdminClient,
  params: { couponId: string | null; userId: string; eventId: string }
): Promise<boolean> {
  if (!params.couponId) return false

  const { data, error } = await admin.rpc('release_coupon_use', {
    p_coupon_id: params.couponId,
    p_user_id: params.userId,
    p_event_id: params.eventId,
  })

  if (error) console.error('[COUPON] release_coupon_use error:', params.couponId, error)
  return data ?? false
}

// Devolve os usos deste cupom que ainda estão presos a inscrições canceladas
// da pessoa. O cancelamento pelo app já devolve o cupom; isto cobre inscrições
// canceladas antes disso existir e serve de rede para qualquer outro caminho.
// Precisa rodar antes de toda checagem de "cupom já usado" ou "esgotado", senão
// a pessoa é barrada por um uso que não vale mais. Devolve quantos usos saíram,
// para quem já leu uses_count antes de chamar.
export async function releaseStaleCouponUses(
  admin: AdminClient,
  params: { couponId: string; userId: string }
): Promise<number> {
  const { data: cancelled } = await admin
    .from('participations')
    .select('id, event_id')
    .eq('user_id', params.userId)
    .eq('coupon_id', params.couponId)
    .eq('status', 'CANCELLED')

  let released = 0
  for (const p of cancelled ?? []) {
    if (await releaseCouponUse(admin, { couponId: params.couponId, userId: params.userId, eventId: p.event_id })) {
      released++
    }
    await admin.from('participations').update({ discount_cents: 0, coupon_id: null }).eq('id', p.id)
  }
  return released
}
