import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPixPayment } from '@/features/participacoes/pix-payment'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { participation_id } = body

  if (!participation_id) {
    return NextResponse.json({ error: 'participation_id required' }, { status: 400 })
  }

  const result = await createPixPayment(user, participation_id)

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.httpStatus })
  return NextResponse.json(result)
}
