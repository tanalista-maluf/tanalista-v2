import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { createDeposit } from '@/features/carteira/wallet'

// Recarga de carteira pelo site; a regra fica em carteira/wallet.ts
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit: 5 tentativas por usuário por 10 minutos
  const rl = checkRateLimit(`deposit:${user.id}`, 5, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const result = await createDeposit(user, body.amount_cents)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.httpStatus })
  return NextResponse.json(result)
}
