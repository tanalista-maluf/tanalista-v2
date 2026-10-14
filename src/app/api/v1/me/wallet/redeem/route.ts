import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { redeemCreditCoupon } from '@/features/carteira/wallet'

const bodySchema = z.object({ code: z.string().max(30) })

// Cupom de crédito resgatado na carteira, pelo app mobile. Mesma regra da server action do site.
export async function POST(request: Request) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Informe o código do cupom.' }, { status: 400 })

  const result = await redeemCreditCoupon(session.user, parsed.data.code)
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}
