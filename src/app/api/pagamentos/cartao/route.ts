import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cardPaymentSchema, createCardPayment } from '@/features/participacoes/card-payment'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = cardPaymentSchema.safeParse(body)
  if (!parsed.success || typeof body?.participation_id !== 'string') {
    return NextResponse.json({ error: 'participation_id e token são obrigatórios' }, { status: 400 })
  }

  const result = await createCardPayment(user, body.participation_id, parsed.data)

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.httpStatus })
  return NextResponse.json(result)
}
