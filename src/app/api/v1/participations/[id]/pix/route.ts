import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { createPixPayment } from '@/features/participacoes/pix-payment'

// Cobrança PIX de uma inscrição pendente, pelo app mobile. Mesma regra da rota do site.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: participationId } = await params
  if (!z.string().uuid().safeParse(participationId).success) {
    return NextResponse.json({ error: 'Inscrição inválida.' }, { status: 400 })
  }

  const result = await createPixPayment(session.user, participationId)

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.httpStatus })
  return NextResponse.json(result)
}
