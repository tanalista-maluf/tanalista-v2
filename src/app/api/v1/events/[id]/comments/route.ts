import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { postComment } from '@/features/eventos/engagement'

const bodySchema = z.object({ content: z.string().max(500) })

// Mensagem no mural do evento, pelo app mobile. Mesma regra da server action do site.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: eventId } = await params
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!z.string().uuid().safeParse(eventId).success || !parsed.success) {
    return NextResponse.json({ error: 'Mensagem inválida' }, { status: 400 })
  }

  const result = await postComment(session.supabase, session.user.id, eventId, parsed.data.content)
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}
