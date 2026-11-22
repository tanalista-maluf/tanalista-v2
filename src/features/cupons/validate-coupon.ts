import { createAdminClient } from '@/lib/supabase/admin'
import { releaseStaleCouponUses } from '@/lib/refunds'

// Validação de cupom para a inscrição num evento, sem nada de transporte: é
// chamada pela server action do site e pela API do app. Só calcula o desconto;
// quem aplica e registra o uso é joinEvent, que revalida tudo.

export type ValidateCouponResult =
  | { error: string }
  | { success: true; discount_cents: number; coupon_id: string }

export async function validateCouponForEvent(
  userId: string,
  code: string,
  eventPrice: number,
  eventId?: string
): Promise<ValidateCouponResult> {
  if (!code?.trim()) return { error: 'Informe o código.' }

  const admin = createAdminClient()
  const normalizedCode = code.trim().toUpperCase()

  let groupId: string | null = null
  if (eventId) {
    const { data: ev } = await admin.from('events').select('group_id').eq('id', eventId).maybeSingle()
    groupId = ev?.group_id ?? null
  }

  let query = admin
    .from('coupons')
    .select('id, amount_cents, percent_off, expires_at, max_uses, uses_count, event_id, group_id')
    .eq('code', normalizedCode)
    .eq('active', true)

  if (eventId && groupId) {
    query = query.or(`event_id.eq.${eventId},group_id.eq.${groupId},and(event_id.is.null,group_id.is.null)`)
  } else if (eventId) {
    query = query.or(`event_id.eq.${eventId},and(event_id.is.null,group_id.is.null)`)
  } else {
    query = query.is('event_id', null).is('group_id', null)
  }

  const { data: coupon } = await query.maybeSingle()

  if (!coupon) return { error: 'Cupom inválido ou expirado.' }
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return { error: 'Cupom expirado.' }

  const released = await releaseStaleCouponUses(admin, { couponId: coupon.id, userId: userId })
  if (coupon.max_uses !== null && coupon.uses_count - released >= coupon.max_uses) return { error: 'Cupom esgotado.' }

  // Cupom de grupo vale 1 uso por evento; os demais, 1 uso por usuário
  let usedQuery = admin.from('coupon_uses').select('id').eq('coupon_id', coupon.id).eq('user_id', userId)
  if (coupon.group_id && eventId) usedQuery = usedQuery.eq('event_id', eventId)
  const { data: alreadyUsed } = await usedQuery.limit(1).maybeSingle()

  if (alreadyUsed) return { error: 'Você já utilizou este cupom.' }

  const discount = coupon.percent_off != null
    ? Math.min(Math.round(eventPrice * (coupon.percent_off / 100)), eventPrice)
    : Math.min(coupon.amount_cents, eventPrice)

  return { success: true, discount_cents: discount, coupon_id: coupon.id }
}
