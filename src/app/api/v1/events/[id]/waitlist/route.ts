import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { joinWaitlist, leaveWaitlist } from '@/features/fila/waitlist'

const bodySchema = z.object({ teamId: z.string().uuid().optional() })

type Context = { params: Promise<{ id: string }> }

// Fila de espera pelo app mobile. Mesmas regras das server actions do site.
export async function POST(request: Request, { params }: Context) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: eventId } = await params
  if (!z.string().uuid().safeParse(eventId).success) {
    return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

  const result = await joinWaitlist(session.supabase, session.user.id, eventId, parsed.data.teamId)
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}

export async function DELETE(request: Request, { params }: Context) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: eventId } = await params
  if (!z.string().uuid().safeParse(eventId).success) {
    return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 })
  }

  const result = await leaveWaitlist(session.supabase, session.user.id, eventId)
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}
