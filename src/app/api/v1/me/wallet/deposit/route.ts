import { NextResponse } from 'next/server'
import { getBearerSession } from '@/lib/supabase/bearer'
import { checkRateLimit } from '@/lib/rate-limit'
import { createDeposit } from '@/features/carteira/wallet'

// Recarga da carteira por PIX, pelo app mobile. Mesma regra da rota do site;
// o saldo entra quando o webhook do Mercado Pago confirma o pagamento.
export async function POST(request: Request) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  // Rate limit: 5 tentativas por usuário por 10 minutos
  const rl = checkRateLimit(`deposit:${session.user.id}`, 5, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const result = await createDeposit(session.user, body.amount_cents)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.httpStatus })
  return NextResponse.json(result)
}
