import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { requestEventJoin } from '@/features/eventos/engagement'

// Pedido de entrada em evento privado, pelo app mobile; o organizador é avisado
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: eventId } = await params
  if (!z.string().uuid().safeParse(eventId).success) {
    return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 })
  }

  // Só de evento que a pessoa enxerga
  const { data: event } = await session.supabase.from('events').select('id').eq('id', eventId).maybeSingle()
  if (!event) return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 })

  const result = await requestEventJoin(session.user.id, eventId)
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}
