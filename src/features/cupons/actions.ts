'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Resgatar cupom (usuário) ─────────────────────────────────────────────────
export async function redeemCouponAction(code: string) {
  if (!code?.trim()) return { error: 'Informe o código do cupom.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  // Exige e-mail verificado para evitar contas descartáveis
  if (!user.email_confirmed_at) {
    return { error: 'Confirme seu e-mail antes de resgatar cupons.' }
  }

  const admin = createAdminClient()
  const normalizedCode = code.trim().toUpperCase()

  // Buscar cupom
  const { data: coupon } = await admin
    .from('coupons')
    .select('*')
    .eq('code', normalizedCode)
    .eq('active', true)
    .maybeSingle()

  if (!coupon) return { error: 'Cupom inválido ou expirado.' }

  // Verificar expiração
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { error: 'Este cupom está expirado.' }
  }

  // Verificar limite de usos
  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
    return { error: 'Este cupom já atingiu o limite de usos.' }
  }

  // Verificar se usuário já usou este cupom
  const { data: alreadyUsed } = await admin
    .from('coupon_uses')
    .select('id')
    .eq('coupon_id', coupon.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (alreadyUsed) return { error: 'Você já utilizou este cupom.' }

  // Creditar na carteira
  const { error: creditError } = await admin.rpc('wallet_credit', {
    p_user_id: user.id,
    p_amount: coupon.amount_cents,
    p_type: 'BONUS',
    p_description: `Cupom resgatado: ${normalizedCode}`,
  })

  if (creditError) {
    console.error('[COUPON] wallet_credit error:', creditError)
    return { error: 'Erro ao creditar cupom: ' + creditError.message }
  }

  // Registrar uso e incrementar contador atomicamente
  await Promise.all([
    admin.from('coupon_uses').insert({ coupon_id: coupon.id, user_id: user.id }),
    admin.from('coupons').update({ uses_count: coupon.uses_count + 1 }).eq('id', coupon.id),
  ])

  revalidatePath('/carteira')
  return { success: true, amount_cents: coupon.amount_cents }
}

// ── Criar cupom (admin) ──────────────────────────────────────────────────────
const createSchema = z.object({
  code: z.string().min(3).max(30).toUpperCase(),
  amount_cents: z.number().int().min(100),
  max_uses: z.number().int().min(1).nullable(),
  expires_at: z.string().nullable(),
})

export async function createCouponAction(input: unknown) {
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
  const admin = createAdminClient()
  await admin.from('coupons').update({ active }).eq('id', id)
  revalidatePath('/admin/cupons')
}

// ── Validar cupom para inscrição (sem consumir) ──────────────────────────────
export async function validateCouponForEventAction(code: string, eventPrice: number) {
  if (!code?.trim()) return { error: 'Informe o código.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()
  const normalizedCode = code.trim().toUpperCase()

  const { data: coupon } = await admin
    .from('coupons')
    .select('id, amount_cents, expires_at, max_uses, uses_count')
    .eq('code', normalizedCode)
    .eq('active', true)
    .maybeSingle()

  if (!coupon) return { error: 'Cupom inválido ou expirado.' }
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return { error: 'Cupom expirado.' }
  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) return { error: 'Cupom esgotado.' }

  const { data: alreadyUsed } = await admin
    .from('coupon_uses')
    .select('id')
    .eq('coupon_id', coupon.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (alreadyUsed) return { error: 'Você já utilizou este cupom.' }

  const discount = Math.min(coupon.amount_cents, eventPrice)
  return { success: true, discount_cents: discount, coupon_id: coupon.id }
}
