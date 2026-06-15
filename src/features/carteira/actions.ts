'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const WITHDRAWAL_FEE_PCT = 1 // 1% de taxa de saque

const PIX_KEY_TYPE_MAP: Record<string, string> = {
  cpf:    'CPF',
  email:  'EMAIL',
  phone:  'PHONE',
  random: 'RANDOM_KEY',
}

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

  // 1. Debitar da carteira antes de enviar (evita duplo saque em retry)
  const { error: debitError } = await admin.rpc('wallet_debit', {
    p_user_id: user.id,
    p_amount: amount_cents,
    p_type: 'WITHDRAWAL',
    p_description: `Saque via PIX — líquido ${(net_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (taxa ${WITHDRAWAL_FEE_PCT}%)`,
  })

  if (debitError) return { error: 'Erro ao processar saque.' }

  // 2. Disparar transferência PIX via MP
  try {
    const mpRes = await fetch('https://api.mercadopago.com/v1/transfers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_PLATFORM_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `withdrawal-${user.id}-${Date.now()}`,
      },
      body: JSON.stringify({
        amount: net_cents / 100,
        currency_id: 'BRL',
        receiver: {
          pix_data: {
            key: pix_key,
            key_type: PIX_KEY_TYPE_MAP[pix_key_type],
          },
        },
        description: 'Saque TáNaLista',
      }),
    })

    const mpData = await mpRes.json()

    // Registrar resultado no audit_log
    await admin.from('audit_logs').insert({
      user_id: user.id,
      action: 'WITHDRAWAL_REQUESTED',
      table_name: 'wallet_transactions',
      new_data: {
        amount_cents,
        fee_cents,
        net_cents,
        cpf_last4: cpf.slice(-4),
        pix_key,
        pix_key_type,
        mp_transfer_id: mpData?.id ?? null,
        mp_status: mpData?.status ?? null,
        mp_response: mpData,
      },
    })

    if (!mpRes.ok) {
      console.error('[WITHDRAWAL] MP transfer error:', mpData)
      // Saldo já foi debitado — estorna de volta
      await admin.rpc('wallet_credit', {
        p_user_id: user.id,
        p_amount: amount_cents,
        p_type: 'REFUND',
        p_description: 'Estorno de saque — falha na transferência PIX',
      })
      const mpError = mpData?.message ?? mpData?.error ?? 'Erro ao processar transferência PIX.'
      return { error: mpError }
    }
  } catch (err) {
    console.error('[WITHDRAWAL] Network error:', err)
    // Estornar saldo em caso de falha de rede
    await admin.rpc('wallet_credit', {
      p_user_id: user.id,
      p_amount: amount_cents,
      p_type: 'REFUND',
      p_description: 'Estorno de saque — erro de conexão',
    })
    return { error: 'Erro de conexão ao processar transferência. Tente novamente.' }
  }

  revalidatePath('/carteira')
  return { success: true }
}
