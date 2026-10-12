import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

// Estorna para a carteira o que foi efetivamente pago por uma inscrição: a soma
// dos pagamentos APPROVED dela. Inscrição gratuita, por cupom de 100% ou por
// isenção do organizador não tem pagamento, então não gera crédito.
//
// Os pagamentos passam a REFUNDED antes do crédito. Isso impede estornar o
// mesmo pagamento duas vezes e o tira do repasse ao organizador caso a pessoa
// se inscreva de novo (a linha de participations é reaproveitada).
export async function refundParticipationPayments(
  admin: AdminClient,
  params: { participationId: string; userId: string; eventId: string; description: string }
): Promise<number> {
  const { data: refunded } = await admin
    .from('payments')
    .update({ status: 'REFUNDED' })
    .eq('participation_id', params.participationId)
    .eq('status', 'APPROVED')
    .select('id, amount')

  const amount = (refunded ?? []).reduce((sum, p) => sum + p.amount, 0)
  if (!refunded || amount <= 0) return 0

  const { error } = await admin.rpc('wallet_credit', {
    p_user_id: params.userId,
    p_amount: amount,
    p_type: 'REFUND',
    p_description: params.description,
    p_event_id: params.eventId,
  })

  if (error) {
    console.error('[REFUND] wallet_credit error:', error)
    await admin.from('payments').update({ status: 'APPROVED' }).in('id', refunded.map((p) => p.id))
    return 0
  }

  return amount
}

// Devolve o uso do cupom de uma inscrição que deixou de valer, para que a
// pessoa possa usá-lo de novo se voltar a se inscrever.
export async function releaseCouponUse(
  admin: AdminClient,
  params: { couponId: string | null; userId: string; eventId: string }
) {
  if (!params.couponId) return

  // Usos de cupom de evento anteriores a coupon_uses.event_id não têm evento
  const { data: uses } = await admin
    .from('coupon_uses')
    .select('id, event_id')
    .eq('coupon_id', params.couponId)
    .eq('user_id', params.userId)
    .or(`event_id.eq.${params.eventId},event_id.is.null`)

  const use = uses?.find((u) => u.event_id === params.eventId) ?? uses?.[0]
  if (!use) return

  await admin.from('coupon_uses').delete().eq('id', use.id)

  const { data: coupon } = await admin.from('coupons').select('uses_count').eq('id', params.couponId).single()
  await admin
    .from('coupons')
    .update({ uses_count: Math.max(0, (coupon?.uses_count ?? 1) - 1) })
    .eq('id', params.couponId)
}
