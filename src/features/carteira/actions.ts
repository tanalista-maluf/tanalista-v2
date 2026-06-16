'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWithdrawalRequestAdmin } from '@/lib/emails'

const WITHDRAWAL_FEE_PCT = 1 // 1% de taxa de saque

const withdrawalSchema = z.object({
  amount_cents: z.number({ error: 'Valor inválido.' }).int().min(500, 'Valor mínimo: R$ 5,00').max(500000, 'Valor máximo: R$ 5.000,00'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF inválido — informe 11 dígitos sem pontuação.'),
  pix_key: z.string().min(1, 'Chave PIX é obrigatória.').max(200),
  pix_key_type: z.enum(['cpf', 'email', 'phone', 'random']),
})

export type WithdrawalInput = z.infer<typeof withdrawalSchema>

export async function requestWithdrawalAction(input: WithdrawalInput) {
  const parsed = withdrawalSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { amount_cents, cpf, pix_key, pix_key_type } = parsed.data

  const fee_cents = Math.round(amount_cents * (WITHDRAWAL_FEE_PCT / 100))
  const net_cents = amount_cents - fee_cents

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('wallet_balance, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.wallet_balance < amount_cents) {
    return { error: 'Saldo insuficiente.', code: 'INSUFFICIENT_BALANCE' }
  }

  const admin = createAdminClient()

  // Debitar da carteira
  const { error: debitError } = await admin.rpc('wallet_debit', {
    p_user_id: user.id,
    p_amount: amount_cents,
    p_type: 'WITHDRAWAL',
    p_description: `Saque via PIX — líquido ${(net_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (taxa ${WITHDRAWAL_FEE_PCT}%)`,
  })

  if (debitError) return { error: 'Erro ao processar saque.' }

  // Registrar saque na tabela dedicada (para o painel admin)
  await admin.from('withdrawals').insert({
    user_id: user.id,
    amount_cents,
    fee_cents,
    net_cents,
    cpf,
    pix_key,
    pix_key_type,
    status: 'PENDING',
  })

  // Notificar admin por e-mail para processar o PIX manualmente
  const { data: authUser } = await admin.auth.admin.getUserById(user.id)
  sendWithdrawalRequestAdmin({
    userName: profile.full_name ?? user.id,
    userEmail: authUser?.user?.email ?? '',
    amountCents: amount_cents,
    feeCents: fee_cents,
    netCents: net_cents,
    pixKey: pix_key,
    pixKeyType: pix_key_type,
  }).then(() => {
    console.log(`[WITHDRAWAL] Admin email sent for user ${user.id}`)
  }).catch(e => {
    console.error('[WITHDRAWAL] Failed to send admin email:', e?.message ?? e)
  })

  revalidatePath('/carteira')
  return { success: true }
}
