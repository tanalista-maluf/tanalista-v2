import { NextResponse } from 'next/server'
import { getBearerSession } from '@/lib/supabase/bearer'
import { isCardPaymentEnabled } from '@/features/participacoes/card-payment'

// Meios de pagamento que dependem de configuração do servidor, para o app
// mobile só oferecer o que funciona.
export async function GET(request: Request) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  return NextResponse.json({ card: isCardPaymentEnabled() })
}
