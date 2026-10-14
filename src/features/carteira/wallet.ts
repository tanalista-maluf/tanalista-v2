import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWithdrawalRequestAdmin } from '@/lib/emails'
import { getPlatformMPClient, Payment } from '@/lib/mercadopago'
import { isCardPaymentEnabled, REJECTION_MESSAGES, type CardPaymentInput } from '@/features/participacoes/card-payment'
import type { Json } from '@/types/database'

// Regras da carteira, sem nada de transporte: usadas pelas server actions e
// rotas do site (sessão em cookie) e pela API do app (token Bearer).

type WalletUser = { id: string; email?: string | null; email_confirmed_at?: string | null }

// ── Saque ────────────────────────────────────────────────────────────────────

export const withdrawalSchema = z.object({
  amount_cents: z.number({ error: 'Valor inválido.' }).int().min(500, 'Valor mínimo: R$ 5,00').max(500000, 'Valor máximo: R$ 5.000,00'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF inválido — informe 11 dígitos sem pontuação.'),
  pix_key: z.string().min(1, 'Chave PIX é obrigatória.').max(200),
  pix_key_type: z.enum(['cpf', 'email', 'phone', 'random']),
})

export type WithdrawalInput = z.infer<typeof withdrawalSchema>

// O saldo sai na hora; o PIX é feito à mão pela equipe, que recebe um e-mail
export async function requestWithdrawal(
  user: WalletUser,
  input: unknown
): Promise<{ error: string; code?: 'INSUFFICIENT_BALANCE' } | { success: true }> {
  const parsed = withdrawalSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { amount_cents, cpf, pix_key, pix_key_type } = parsed.data

  // Sem taxa de saque: a taxa de gateway já é cobrada no momento do pagamento/depósito.
  const fee_cents = 0
  const net_cents = amount_cents

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
  sendWithdrawalRequestAdmin({
    userName: profile.full_name ?? user.id,
    userEmail: user.email ?? '',
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

// ── Recarga por PIX ──────────────────────────────────────────────────────────
// Usa credenciais DA PLATAFORMA (não do organizador): não há organizador numa recarga

export const MIN_DEPOSIT_CENTS = 1000  // R$ 10,00
export const MAX_DEPOSIT_CENTS = 500000 // R$ 5.000,00

// Fora de produção, MERCADOPAGO_STUB=1 devolve uma cobrança de mentira, como
// em pix-payment.ts: o teste de ponta a ponta do app roda sem credenciais
const useStub = process.env.NODE_ENV !== 'production' && process.env.MERCADOPAGO_STUB === '1'
const STUB_QR_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

export type DepositResult =
  | { error: string; httpStatus: 400 | 500 }
  | { payment_id: string | number; qr_code?: string; qr_code_base64?: string; expires_at: string }

export async function createDeposit(user: WalletUser, amountCents: unknown): Promise<DepositResult> {
  if (!amountCents || typeof amountCents !== 'number' || !Number.isInteger(amountCents)) {
    return { error: 'Informe o valor da recarga.', httpStatus: 400 }
  }

  if (amountCents < MIN_DEPOSIT_CENTS) {
    return {
      error: `Valor mínimo para recarga: R$ ${(MIN_DEPOSIT_CENTS / 100).toFixed(2).replace('.', ',')}`,
      httpStatus: 400,
    }
  }

  if (amountCents > MAX_DEPOSIT_CENTS) {
    return {
      error: `Valor máximo por recarga: R$ ${(MAX_DEPOSIT_CENTS / 100).toFixed(2).replace('.', ',')}`,
      httpStatus: 400,
    }
  }

  const admin = createAdminClient()

  // Cria wallet_transaction PENDING para rastrear
  const { data: pendingTx } = await admin
    .from('wallet_transactions')
    .insert({
      user_id: user.id,
      type: 'DEPOSIT',
      amount: amountCents,
      balance_after: 0, // será atualizado quando confirmado
      description: 'Recarga de carteira — aguardando pagamento PIX',
    })
    .select('id')
    .single()

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

  try {
    const mpPayment = useStub
      ? {
          id: `stub-deposit-${pendingTx?.id ?? Date.now()}`,
          point_of_interaction: {
            transaction_data: { qr_code: `00020126-PIX-DE-TESTE-RECARGA-${amountCents}`, qr_code_base64: STUB_QR_BASE64 },
          },
        }
      : await new Payment(getPlatformMPClient()).create({
          body: {
            transaction_amount: amountCents / 100,
            description: 'Recarga da carteira TáNaLista',
            payment_method_id: 'pix',
            payer: { email: user.email! },
            external_reference: `deposit:${user.id}:${pendingTx?.id ?? ''}`,
            date_of_expiration: expiresAt,
            notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
          },
        })

    const pixData = (mpPayment as { point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } } })
      .point_of_interaction?.transaction_data

    // Criar payment record associado à wallet transaction
    await admin.from('payments').insert({
      wallet_transaction_id: pendingTx?.id,
      payer_id: user.id,
      amount: amountCents,
      platform_fee: 0,
      gateway_fee: 0,
      method: 'PIX',
      status: 'PENDING',
      gateway_transaction_id: String(mpPayment.id),
      gateway_response: mpPayment as unknown as Json,
    })

    return {
      payment_id: mpPayment.id!,
      qr_code: pixData?.qr_code,
      qr_code_base64: pixData?.qr_code_base64,
      expires_at: expiresAt,
    }
  } catch (err: unknown) {
    const error = err as { message?: string }
    // Limpar pendingTx em caso de falha
    if (pendingTx) {
      await admin.from('wallet_transactions').delete().eq('id', pendingTx.id)
    }
    console.error('[DEPOSITO] Error:', error)
    return { error: error.message ?? 'Erro ao criar PIX de recarga', httpStatus: 500 }
  }
}

// ── Recarga por cartão ───────────────────────────────────────────────────────
// A taxa do cartão sai do valor creditado: quem recarrega R$ 100,00 à vista
// recebe R$ 97,00 de saldo; parcelado, R$ 95,00

export const CARD_DEPOSIT_FEE = { single: 0.03, installments: 0.05 }

export function cardDepositFee(amountCents: number, installments: number) {
  return Math.round(amountCents * (installments > 1 ? CARD_DEPOSIT_FEE.installments : CARD_DEPOSIT_FEE.single))
}

export type CardDepositResult =
  | { error: string; httpStatus: 400 | 402 | 500 }
  | { status: 'approved' | 'in_process'; credited: number }

export async function createCardDeposit(
  user: WalletUser,
  amountCents: unknown,
  card: CardPaymentInput
): Promise<CardDepositResult> {
  if (!isCardPaymentEnabled()) return { error: 'Pagamento com cartão indisponível.', httpStatus: 400 }
  if (typeof amountCents !== 'number' || !Number.isInteger(amountCents)) {
    return { error: 'Informe o valor da recarga.', httpStatus: 400 }
  }
  if (amountCents < MIN_DEPOSIT_CENTS || amountCents > MAX_DEPOSIT_CENTS) {
    return { error: 'Valor fora dos limites de recarga.', httpStatus: 400 }
  }

  const installments = card.installments ?? 1
  const fee = cardDepositFee(amountCents, installments)
  const admin = createAdminClient()

  // Mesma marcação da recarga por PIX: o valor cobrado fica na transação
  // pendente, e o crédito (valor menos a taxa) sai em confirmWalletDeposit
  const { data: pendingTx } = await admin
    .from('wallet_transactions')
    .insert({
      user_id: user.id,
      type: 'DEPOSIT',
      amount: amountCents,
      balance_after: 0,
      description: 'Recarga de carteira — aguardando pagamento com cartão',
    })
    .select('id')
    .single()
  if (!pendingTx) return { error: 'Erro ao iniciar a recarga.', httpStatus: 500 }

  let charge: { id?: number | string; status?: string; status_detail?: string }
  try {
    if (useStub) {
      const id = `stub-card-deposit-${pendingTx.id}`
      charge =
        card.token === 'stub-rejected'
          ? { id, status: 'rejected', status_detail: 'cc_rejected_insufficient_amount' }
          : { id, status: 'approved', status_detail: 'accredited' }
    } else {
      charge = await new Payment(getPlatformMPClient()).create({
        body: {
          transaction_amount: amountCents / 100,
          description: 'Recarga da carteira TáNaLista',
          token: card.token,
          installments,
          payment_method_id: card.payment_method_id,
          ...(card.issuer_id && { issuer_id: Number(card.issuer_id) }),
          payer: {
            email: user.email!,
            ...(card.identification?.number && {
              identification: { type: card.identification.type ?? 'CPF', number: card.identification.number },
            }),
          },
          external_reference: `deposit:${user.id}:${pendingTx.id}`,
          notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
        },
        requestOptions: { idempotencyKey: `card-deposit-${pendingTx.id}` },
      })
    }
  } catch (err) {
    console.error('[DEPOSITO] card error:', err)
    await admin.from('wallet_transactions').delete().eq('id', pendingTx.id)
    return { error: 'Não foi possível processar o cartão. Tente novamente.', httpStatus: 500 }
  }

  const status = charge.status === 'approved' ? 'APPROVED' : charge.status === 'rejected' ? 'REJECTED' : 'PENDING'

  // platform_fee guarda a taxa: é o que confirmWalletDeposit desconta do crédito
  await admin.from('payments').insert({
    wallet_transaction_id: pendingTx.id,
    payer_id: user.id,
    amount: amountCents,
    platform_fee: fee,
    gateway_fee: 0,
    method: 'CREDIT_CARD',
    status,
    gateway_transaction_id: String(charge.id),
    gateway_response: charge as unknown as Json,
  })

  if (status === 'REJECTED') {
    await admin.from('wallet_transactions').delete().eq('id', pendingTx.id)
    const reason = REJECTION_MESSAGES[charge.status_detail ?? ''] ?? 'Use outro cartão ou recarregue por PIX.'
    return { error: `Pagamento recusado. ${reason}`, httpStatus: 402 }
  }

  // Em análise: o webhook credita quando o Mercado Pago aprovar
  if (status === 'PENDING') return { status: 'in_process', credited: amountCents - fee }

  await confirmWalletDeposit(user.id, pendingTx.id, amountCents)
  return { status: 'approved', credited: amountCents - fee }
}

// Credita uma recarga aprovada (PIX ou cartão), a partir da transação
// pendente: o valor pago menos a taxa registrada no pagamento (zero no PIX).
// Chamada pelo webhook e pela recarga com cartão aprovada na hora; a transação
// pendente some, então uma segunda chamada não credita de novo.
export async function confirmWalletDeposit(userId: string, txId: string, paidCents: number) {
  const admin = createAdminClient()

  const { data: pendingTx } = await admin
    .from('wallet_transactions')
    .select('amount')
    .eq('id', txId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!pendingTx) {
    console.warn(`[DEPOSITO] tx ${txId} not found or already processed`)
    return false
  }

  // Valida contra o valor registrado (evita creditar valor manipulado)
  if (Math.abs(paidCents - pendingTx.amount) > 1) {
    console.error(`[DEPOSITO] amount mismatch: paid=${paidCents} DB=${pendingTx.amount} — aborting`)
    return false
  }

  const { data: payment } = await admin
    .from('payments')
    .select('method, platform_fee')
    .eq('wallet_transaction_id', txId)
    .maybeSingle()
  const fee = payment?.platform_fee ?? 0
  const byCard = payment?.method === 'CREDIT_CARD'

  // Some antes de creditar: duas confirmações simultâneas não creditam duas vezes
  const { data: removed } = await admin.from('wallet_transactions').delete().eq('id', txId).select('id')
  if (!removed?.length) return false

  await admin.rpc('wallet_credit', {
    p_user_id: userId,
    p_amount: pendingTx.amount - fee,
    p_type: 'DEPOSIT',
    p_description: byCard
      ? `Recarga de carteira via cartão (taxa de R$ ${(fee / 100).toFixed(2).replace('.', ',')})`
      : 'Recarga de carteira via PIX',
  })
  return true
}

// ── Cupom de crédito ─────────────────────────────────────────────────────────
// Só cupons da plataforma (sem evento nem grupo), que viram saldo na carteira

export async function redeemCreditCoupon(
  user: WalletUser,
  code: string
): Promise<{ error: string } | { success: true; amount_cents: number }> {
  if (!code?.trim()) return { error: 'Informe o código do cupom.' }

  // Exige e-mail verificado para evitar contas descartáveis
  if (!user.email_confirmed_at) {
    return { error: 'Confirme seu e-mail antes de resgatar cupons.' }
  }

  const admin = createAdminClient()
  const normalizedCode = code.trim().toUpperCase()

  const { data: coupon } = await admin
    .from('coupons')
    .select('*')
    .eq('code', normalizedCode)
    .eq('active', true)
    .is('event_id', null)
    .is('group_id', null)
    .maybeSingle()

  if (!coupon) return { error: 'Cupom inválido ou expirado.' }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { error: 'Este cupom está expirado.' }
  }

  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
    return { error: 'Este cupom já atingiu o limite de usos.' }
  }

  const { data: alreadyUsed } = await admin
    .from('coupon_uses')
    .select('id')
    .eq('coupon_id', coupon.id)
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (alreadyUsed) return { error: 'Você já utilizou este cupom.' }

  const { error: creditError } = await admin.rpc('wallet_credit', {
    p_user_id: user.id,
    p_amount: coupon.amount_cents,
    p_type: 'BONUS',
    p_description: `Cupom resgatado: ${normalizedCode}`,
  })

  if (creditError) {
    console.error('[COUPON] wallet_credit error:', creditError)
    return { error: 'Erro ao creditar cupom. Tente novamente.' }
  }

  // Registrar uso e incrementar contador
  await Promise.all([
    admin.from('coupon_uses').insert({ coupon_id: coupon.id, user_id: user.id }),
    admin.from('coupons').update({ uses_count: coupon.uses_count + 1 }).eq('id', coupon.id),
  ])

  revalidatePath('/carteira')
  return { success: true, amount_cents: coupon.amount_cents }
}
