import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { getEventTeams } from '@/features/eventos/teams'

// Times do evento com a ocupação de cada um. O app não consegue contar
// sozinho: pela RLS cada pessoa só enxerga a própria inscrição.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: eventId } = await params
  if (!z.string().uuid().safeParse(eventId).success) {
    return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 })
  }

  // Só de evento que a pessoa enxerga
  const { data: event } = await session.supabase.from('events').select('id').eq('id', eventId).maybeSingle()
  if (!event) return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 })

  return NextResponse.json({ teams: await getEventTeams(eventId) })
}
