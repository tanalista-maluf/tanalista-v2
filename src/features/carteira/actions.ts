'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWithdrawalRequestAdmin } from '@/lib/emails'

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

  // Sem taxa de saque: a taxa de gateway já é cobrada no momento do pagamento/depósito.
  const fee_cents = 0
  const net_cents = amount_cents

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('wallet_balance, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.wallet_balance < amount_cents) {
    return { error: 'Saldo insuficiente.', code: 'INSUFFICIENT_BALANCE' }
  }

  // Debitar da carteira
  const { error: debitError } = await admin.rpc('wallet_debit', {
    p_user_id: user.id,
    p_amount: amount_cents,
    p_type: 'WITHDRAWAL',
    p_description: `Saque via PIX`,
  })

  if (debitError) return { error: 'Erro ao processar saque.' }

  // Registrar saque na tabela dedicada (para o painel admin)
  const { error: insertError } = await admin.from('withdrawals').insert({
    user_id: user.id,
    amount_cents,
    fee_cents,
    net_cents,
    cpf,
    pix_key,
    pix_key_type,
    status: 'PENDING',
  })

  if (insertError) {
    console.error('[WITHDRAWAL] Failed to insert withdrawal request:', insertError.message)
    // Reverter o débito já aplicado — sem isso o saldo desaparece sem nenhum
    // registro para o admin processar.
    await admin.rpc('wallet_credit', {
      p_user_id: user.id,
      p_amount: amount_cents,
      p_type: 'REFUND',
      p_description: 'Erro ao registrar saque — valor estornado',
    })
    return { error: 'Erro ao processar saque. Tente novamente.' }
  }

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
