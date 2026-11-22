import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { cardPaymentSchema, createCardPayment } from '@/features/participacoes/card-payment'

// Cobrança no cartão de uma inscrição pendente, pelo app mobile. Mesma regra da rota do site.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: participationId } = await params
  if (!z.string().uuid().safeParse(participationId).success) {
    return NextResponse.json({ error: 'Inscrição inválida.' }, { status: 400 })
  }

  const parsed = cardPaymentSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dados do cartão inválidos.' }, { status: 400 })

  const result = await createCardPayment(session.user, participationId, parsed.data)

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.httpStatus })
  return NextResponse.json(result)
}
