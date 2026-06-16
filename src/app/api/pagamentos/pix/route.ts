import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganizerMPClient, getPlatformMPClient, calculateFees, Payment } from '@/lib/mercadopago'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { participation_id } = body

  if (!participation_id) {
    return NextResponse.json({ error: 'participation_id required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Buscar participação e evento
  const { data: participation } = await admin
    .from('participations')
    .select('*, events(id, title, price, organizer_id, mp_access_token, profiles!events_organizer_id_fkey(full_name))')
    .eq('id', participation_id)
    .eq('user_id', user.id)
    .single()

  if (!participation) {
    return NextResponse.json({ error: 'Participação não encontrada' }, { status: 404 })
  }

  if (participation.status !== 'PENDING') {
    return NextResponse.json({ error: 'Participação não está pendente' }, { status: 400 })
  }

  const event = (participation as any).events
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  // Reutilizar pagamento PIX pendente se já existir
  const { data: existingPayment } = await admin
    .from('payments')
    .select('gateway_transaction_id, gateway_response')
    .eq('participation_id', participation_id)
    .eq('status', 'PENDING')
    .eq('method', 'PIX')
    .maybeSingle()

  if (existingPayment?.gateway_response) {
    const gr = existingPayment.gateway_response as any
    const pixData = gr?.point_of_interaction?.transaction_data
    if (pixData?.qr_code) {
      return NextResponse.json({
        payment_id: existingPayment.gateway_transaction_id,
        qr_code: pixData.qr_code,
        qr_code_base64: pixData.qr_code_base64,
        expires_at: gr?.date_of_expiration ?? new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
    }
  }

  const effectivePrice = Math.max(0, event.price - ((participation as any).discount_cents ?? 0))
  const fees = calculateFees(effectivePrice, 'PIX')

  // Escolhe client: se o organizador tem token, usa marketplace; senão usa plataforma
  const mpClient = event.mp_access_token
    ? getOrganizerMPClient(event.mp_access_token)
    : getPlatformMPClient()

  const payment = new Payment(mpClient)

  try {
    const mpPayment = await payment.create({
      body: {
        transaction_amount: effectivePrice / 100, // MP usa reais, não centavos
        description: `Inscrição: ${event.title}`,
        payment_method_id: 'pix',
        payer: {
          email: user.email!,
        },
        // Split: taxa da plataforma (marketplace)
        ...(event.mp_access_token && {
          application_fee: fees.platform_fee / 100,
        }),
        // Idempotência
        external_reference: participation_id,
        // Expiração de 30 minutos
        date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
      },
    })

    const pixData = (mpPayment as any).point_of_interaction?.transaction_data

    // Registrar pagamento no banco
    const { data: dbPayment } = await admin.from('payments').insert({
      participation_id,
      payer_id: user.id,
      amount: effectivePrice,
      platform_fee: fees.platform_fee,
      gateway_fee: fees.gateway_fee,
      method: 'PIX',
      status: 'PENDING',
      gateway_transaction_id: String(mpPayment.id),
      gateway_response: mpPayment as unknown as Record<string, unknown>,
    }).select('id').single()

    // Associar pagamento à participação
    if (dbPayment) {
      await admin
        .from('participations')
        .update({ payment_id: dbPayment.id })
        .eq('id', participation_id)
    }

    return NextResponse.json({
      payment_id: mpPayment.id,
      qr_code: pixData?.qr_code,
      qr_code_base64: pixData?.qr_code_base64,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
  } catch (err: unknown) {
    const error = err as { message?: string }
    console.error('[PIX] Error creating payment:', error)
    return NextResponse.json(
      { error: error.message ?? 'Erro ao criar pagamento PIX' },
      { status: 500 }
    )
  }
}
