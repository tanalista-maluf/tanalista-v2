import { NextResponse } from 'next/server'
import { getBearerSession } from '@/lib/supabase/bearer'
import { createAdminClient } from '@/lib/supabase/admin'

// PIX de recarga pendente nos últimos 30 min, pro app retomar em vez de gerar
// um novo (mesma regra de src/app/(app)/carteira/deposito/page.tsx).
export async function GET(request: Request) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const admin = createAdminClient()
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { data: pendingPayment } = await admin
    .from('payments')
    .select('id, amount, gateway_response, created_at')
    .eq('payer_id', session.user.id)
    .eq('status', 'PENDING')
    .eq('method', 'PIX')
    .is('participation_id', null)
    .gte('created_at', thirtyMinAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!pendingPayment) return NextResponse.json({ pending: null })

  const resp = pendingPayment.gateway_response as { point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } } } | null
  const pixData = resp?.point_of_interaction?.transaction_data
  if (!pixData?.qr_code) return NextResponse.json({ pending: null })

  return NextResponse.json({
    pending: {
      payment_id: pendingPayment.id,
      qr_code: pixData.qr_code,
      qr_code_base64: pixData.qr_code_base64 ?? '',
      amount: pendingPayment.amount,
      expires_at: new Date(new Date(pendingPayment.created_at).getTime() + 30 * 60 * 1000).toISOString(),
    },
  })
}
