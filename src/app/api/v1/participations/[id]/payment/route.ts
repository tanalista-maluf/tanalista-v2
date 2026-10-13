import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { getOpenPayment } from '@/features/participacoes/card-payment'

// Cobrança em aberto de uma inscrição pendente, para o app mobile decidir para
// onde levar quem toca em "Pagar": ao PIX já gerado, ou ao checkout.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: participationId } = await params
  if (!z.string().uuid().safeParse(participationId).success) {
    return NextResponse.json({ error: 'Inscrição inválida.' }, { status: 400 })
  }

  // Pela sessão de quem chama: a RLS só devolve a inscrição se for dela
  const { data: participation } = await session.supabase
    .from('participations')
    .select('id')
    .eq('id', participationId)
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!participation) return NextResponse.json({ error: 'Inscrição não encontrada.' }, { status: 404 })

  return NextResponse.json({ open: await getOpenPayment(participationId) })
}
