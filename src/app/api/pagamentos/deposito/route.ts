import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlatformMPClient, Payment } from '@/lib/mercadopago'

// Recarga de carteira — usa credenciais DA PLATAFORMA (não do organizador)
// Doc 15 Adendo 02: não há organizer em uma recarga

const MIN_DEPOSIT_CENTS = 1000  // R$ 10,00
const MAX_DEPOSIT_CENTS = 500000 // R$ 5.000,00

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { amount_cents } = body

  if (!amount_cents || typeof amount_cents !== 'number') {
    return NextResponse.json({ error: 'amount_cents é obrigatório' }, { status: 400 })
  }

  if (amount_cents < MIN_DEPOSIT_CENTS) {
    return NextResponse.json({
      error: `Valor mínimo para recarga: R$ ${(MIN_DEPOSIT_CENTS / 100).toFixed(2).replace('.', ',')}`,
    }, { status: 400 })
  }

  if (amount_cents > MAX_DEPOSIT_CENTS) {
    return NextResponse.json({
      error: `Valor máximo por recarga: R$ ${(MAX_DEPOSIT_CENTS / 100).toFixed(2).replace('.', ',')}`,
    }, { status: 400 })
  }

  const admin = createAdminClient()
  const mpClient = getPlatformMPClient()
  const payment = new Payment(mpClient)

  // Cria wallet_transaction PENDING para rastrear
  const { data: pendingTx } = await admin
    .from('wallet_transactions')
    .insert({
      user_id: user.id,
      type: 'DEPOSIT',
      amount: amount_cents,
      balance_after: 0, // será atualizado quando confirmado
      description: 'Recarga de carteira — aguardando pagamento PIX',
    })
    .select('id')
    .single()

  try {
    const mpPayment = await payment.create({
      body: {
        transaction_amount: amount_cents / 100,
        description: 'Recarga da carteira TáNaLista',
        payment_method_id: 'pix',
        payer: { email: user.email! },
        external_reference: `deposit:${user.id}:${pendingTx?.id ?? ''}`,
        date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
      },
    })

    const pixData = (mpPayment as any).point_of_interaction?.transaction_data

    // Criar payment record associado à wallet transaction
    await admin.from('payments').insert({
      wallet_transaction_id: pendingTx?.id,
      payer_id: user.id,
      amount: amount_cents,
      platform_fee: 0,
      gateway_fee: 0,
      method: 'PIX',
      status: 'PENDING',
      gateway_transaction_id: String(mpPayment.id),
      gateway_response: mpPayment as unknown as Record<string, unknown>,
    })

    return NextResponse.json({
      payment_id: mpPayment.id,
      qr_code: pixData?.qr_code,
      qr_code_base64: pixData?.qr_code_base64,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
  } catch (err: unknown) {
    const error = err as { message?: string }
    // Limpar pendingTx em caso de falha
    if (pendingTx) {
      await admin.from('wallet_transactions').delete().eq('id', pendingTx.id)
    }
    console.error('[DEPOSITO] Error:', error)
    return NextResponse.json({ error: error.message ?? 'Erro ao criar PIX de recarga' }, { status: 500 })
  }
}
