import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { getEventExtras } from '@/features/eventos/engagement'

// Participantes, mural, enquetes, fotos e avaliações de um evento, para o app mobile
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: eventId } = await params
  const extras = z.string().uuid().safeParse(eventId).success
    ? await getEventExtras(session.supabase, session.user.id, eventId)
    : null
  if (!extras) return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 })
  return NextResponse.json(extras)
}
