import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { confirmWaitlistSpot } from '@/features/fila/waitlist'

const bodySchema = z.object({ method: z.enum(['PIX', 'CREDIT_CARD', 'WALLET']).default('PIX') })

// Confirma a vaga que a fila de espera reservou para a pessoa, pelo app mobile
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: eventId } = await params
  if (!z.string().uuid().safeParse(eventId).success) {
    return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

  const result = await confirmWaitlistSpot(session.supabase, session.user.id, eventId, parsed.data.method)
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}
