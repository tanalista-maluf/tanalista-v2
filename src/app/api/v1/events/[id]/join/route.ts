import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { joinEvent } from '@/features/participacoes/join-event'

const bodySchema = z.object({
  method: z.enum(['PIX', 'CREDIT_CARD', 'WALLET']).default('PIX'),
  teamId: z.string().uuid().optional(),
  couponCode: z.string().max(30).optional(),
})

// Inscrição em evento pelo app mobile. Mesma regra da server action do site.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: eventId } = await params
  if (!z.string().uuid().safeParse(eventId).success) {
    return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

  const result = await joinEvent(session.supabase, session.user.id, { eventId, ...parsed.data })

  if ('error' in result) {
    return NextResponse.json(result, { status: result.code === 'FULL' ? 409 : 400 })
  }
  return NextResponse.json(result)
}
