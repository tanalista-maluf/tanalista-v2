import { NextResponse } from 'next/server'
import { getBearerSession } from '@/lib/supabase/bearer'
import { requestWithdrawal } from '@/features/carteira/wallet'

// Saque por PIX pelo app mobile. Mesma regra da server action do site.
export async function POST(request: Request) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const result = await requestWithdrawal(session.user, await request.json().catch(() => ({})))
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}
