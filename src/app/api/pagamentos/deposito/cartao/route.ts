import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { createCardDeposit } from '@/features/carteira/wallet'
import { cardPaymentSchema } from '@/features/participacoes/card-payment'

// Recarga da carteira com cartão pelo site. O crédito é o valor menos a taxa
// do cartão (3% à vista, 5% parcelado); a regra fica em carteira/wallet.ts
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(`deposit:${user.id}`, 5, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const card = cardPaymentSchema.safeParse(body.card)
  if (!card.success) return NextResponse.json({ error: 'Dados do cartão inválidos.' }, { status: 400 })

  const result = await createCardDeposit(user, body.amount_cents, card.data)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.httpStatus })
  return NextResponse.json(result)
}
