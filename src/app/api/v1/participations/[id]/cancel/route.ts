import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { cancelParticipation } from '@/features/participacoes/cancel-participation'

// Cancelamento de inscrição pelo app mobile. Mesma regra da server action do site.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: participationId } = await params
  if (!z.string().uuid().safeParse(participationId).success) {
    return NextResponse.json({ error: 'Inscrição inválida.' }, { status: 400 })
  }

  const result = await cancelParticipation(session.supabase, session.user.id, participationId)

  if ('error' in result) return NextResponse.json(result, { status: 400 })
  return NextResponse.json(result)
}
