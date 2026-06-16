import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganizerMPClient, getPlatformMPClient, calculateFees, Payment } from '@/lib/mercadopago'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { participation_id, token, installments, payment_method_id, issuer_id } = body

  if (!participation_id || !token) {
    return NextResponse.json({ error: 'participation_id e token são obrigatórios' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: participation } = await admin
    .from('participations')
    .select('*, events(id, title, price, organizer_id, mp_access_token)')
    .eq('id', participation_id)
    .eq('user_id', user.id)
    .single()

  if (!participation || participation.status !== 'PENDING') {
    return NextResponse.json({ error: 'Participação inválida' }, { status: 400 })
  }

  const event = (participation as any).events
  const effectivePrice = Math.max(0, event.price - ((participation as any).discount_cents ?? 0))
  const fees = calculateFees(effectivePrice, 'CREDIT_CARD')

  const mpClient = event.mp_access_token
    ? getOrganizerMPClient(event.mp_access_token)
    : getPlatformMPClient()

  const payment = new Payment(mpClient)

  try {
    const mpPayment = await payment.create({
      body: {
        transaction_amount: effectivePrice / 100,
        description: `Inscrição: ${event.title}`,
        token,
        installments: installments ?? 1,
        payment_method_id,
        issuer_id,
        payer: { email: user.email! },
        external_reference: participation_id,
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
        ...(event.mp_access_token && {
          application_fee: fees.platform_fee / 100,
        }),
      },
    })

    const status = mpPayment.status === 'approved' ? 'APPROVED' : 'PENDING'

    const { data: dbPayment } = await admin.from('payments').insert({
      participation_id,
      payer_id: user.id,
      amount: effectivePrice,
      platform_fee: fees.platform_fee,
      gateway_fee: fees.gateway_fee,
      method: 'CREDIT_CARD',
      status,
      gateway_transaction_id: String(mpPayment.id),
      gateway_response: mpPayment as unknown as Record<string, unknown>,
    }).select('id').single()

    if (dbPayment) {
      await admin.from('participations').update({ payment_id: dbPayment.id }).eq('id', participation_id)
    }

    // Se aprovado imediatamente, confirmar participação
    if (status === 'APPROVED') {
      await admin.from('participations').update({ status: 'CONFIRMED' }).eq('id', participation_id)
    }

    return NextResponse.json({
      payment_id: mpPayment.id,
      status: mpPayment.status,
      status_detail: mpPayment.status_detail,
    })
  } catch (err: unknown) {
    const error = err as { message?: string }
    console.error('[CARTAO] Error:', error)
    return NextResponse.json({ error: error.message ?? 'Erro ao processar cartão' }, { status: 500 })
  }
}
