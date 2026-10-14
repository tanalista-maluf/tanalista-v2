'use server'

import { redeemCreditCoupon } from '@/features/carteira/wallet'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateCouponForEvent } from './validate-coupon'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) throw new Error('Acesso negado.')
  return user
}

// ── Resgatar cupom (usuário) ─────────────────────────────────────────────────
export async function redeemCouponAction(code: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  return redeemCreditCoupon(user, code)
}

// ── Criar cupom (admin) ──────────────────────────────────────────────────────
const createSchema = z.object({
  code: z.string().min(3).max(30).toUpperCase(),
  amount_cents: z.number().int().min(100),
  max_uses: z.number().int().min(1).nullable(),
  expires_at: z.string().nullable(),
})

export async function createCouponAction(input: unknown) {
  await assertAdmin()

  const parsed = createSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()

  const { error } = await admin.from('coupons').insert({
    ...parsed.data,
    uses_count: 0,
    active: true,
  })

  if (error?.code === '23505') return { error: 'Já existe um cupom com este código.' }
  if (error) return { error: 'Erro ao criar cupom.' }

  revalidatePath('/admin/cupons')
  return { success: true }
}

// ── Desativar/ativar cupom (admin) ───────────────────────────────────────────
export async function toggleCouponAction(id: string, active: boolean) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('coupons').update({ active }).eq('id', id)
  revalidatePath('/admin/cupons')
}

// ── Validar cupom para inscrição (sem consumir) ──────────────────────────────
export async function validateCouponForEventAction(code: string, eventPrice: number, eventId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  return validateCouponForEvent(user.id, code, eventPrice, eventId)
}

// ── Cupons de evento (organizador) ───────────────────────────────────────────
async function assertEventOrganizer(eventId: string, userId: string) {
  const admin = createAdminClient()
  const { data: event } = await admin
    .from('events')
    .select('id, organizer_id, price, group_id')
    .eq('id', eventId)
    .single()

  if (!event || event.organizer_id !== userId) throw new Error('Sem permissão.')
  return event
}

const createEventCouponSchema = z.object({
  code: z.string().min(3).max(30).toUpperCase(),
  max_uses: z.number().int().min(1).max(999),
  percent_off: z.number().int().min(1).max(100),
  group_wide: z.boolean().optional(),
})

export async function createEventCouponAction(eventId: string, input: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const parsed = createEventCouponSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  let event
  try {
    event = await assertEventOrganizer(eventId, user.id)
  } catch {
    return { error: 'Sem permissão.' }
  }

  const groupWide = !!parsed.data.group_wide && !!event.group_id

  const admin = createAdminClient()
  const { error } = await admin.from('coupons').insert({
    code: parsed.data.code,
    amount_cents: Math.round(event.price * (parsed.data.percent_off / 100)),
    percent_off: parsed.data.percent_off,
    max_uses: parsed.data.max_uses,
    expires_at: null,
    active: true,
    uses_count: 0,
    event_id: groupWide ? null : eventId,
    group_id: groupWide ? event.group_id : null,
  })

  if (error?.code === '23505') return { error: 'Já existe um cupom com este código.' }
  if (error) return { error: 'Erro ao criar cupom.' }

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}

export async function listEventCouponsAction(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.', coupons: [] }

  let event
  try {
    event = await assertEventOrganizer(eventId, user.id)
  } catch {
    return { error: 'Sem permissão.', coupons: [] }
  }

  const admin = createAdminClient()
  const scopeFilter = event.group_id
    ? `event_id.eq.${eventId},group_id.eq.${event.group_id}`
    : `event_id.eq.${eventId}`
  const { data } = await admin
    .from('coupons')
    .select('id, code, max_uses, uses_count, active, amount_cents, percent_off, event_id, group_id, created_at')
    .or(scopeFilter)
    .order('created_at', { ascending: false })

  return { coupons: data ?? [] }
}

export async function toggleEventCouponAction(eventId: string, couponId: string, active: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  let event
  try {
    event = await assertEventOrganizer(eventId, user.id)
  } catch {
    return { error: 'Sem permissão.' }
  }

  const admin = createAdminClient()
  const { data: coupon } = await admin.from('coupons').select('id, event_id, group_id').eq('id', couponId).maybeSingle()
  const belongsHere = coupon && (coupon.event_id === eventId || (!!event.group_id && coupon.group_id === event.group_id))
  if (!belongsHere) return { error: 'Cupom não pertence a este evento.' }

  await admin.from('coupons').update({ active }).eq('id', couponId)
  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}
