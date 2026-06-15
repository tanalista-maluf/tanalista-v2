'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const withdrawalSchema = z.object({
  amount_cents: z.number({ error: 'Valor inválido.' }).int().min(1000, 'Valor mínimo: R$ 10,00').max(500000, 'Valor máximo: R$ 5.000,00'),
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

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  // Verificar saldo suficiente
  const { data: profile } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', user.id)
    .single()

  if (!profile || profile.wallet_balance < amount_cents) {
    return { error: 'Saldo insuficiente.', code: 'INSUFFICIENT_BALANCE' }
  }

  const admin = createAdminClient()

  // Bloquear saldo via debit
  const { error: debitError } = await admin.rpc('wallet_debit', {
    p_user_id: user.id,
    p_amount: amount_cents,
    p_type: 'WITHDRAWAL',
    p_description: `Saque via PIX (${pix_key_type.toUpperCase()})`,
  })

  if (debitError) return { error: 'Erro ao processar saque.' }

  // Registrar requisição de saque (para processamento manual / futuro payout automatizado)
  await admin.from('audit_logs').insert({
    user_id: user.id,
    action: 'WITHDRAWAL_REQUESTED',
    table_name: 'wallet_transactions',
    new_data: {
      amount_cents,
      cpf_last4: cpf.slice(-4),
      pix_key,
      pix_key_type,
    },
  })

  revalidatePath('/carteira')
  return { success: true }
}
