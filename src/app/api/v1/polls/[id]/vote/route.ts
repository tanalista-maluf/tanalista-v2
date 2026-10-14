import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { votePoll } from '@/features/eventos/engagement'

const bodySchema = z.object({ optionId: z.string().uuid() })

// Voto em enquete do mural, pelo app mobile. Um voto por pessoa.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: pollId } = await params
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!z.string().uuid().safeParse(pollId).success || !parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const result = await votePoll(session.supabase, session.user.id, pollId, parsed.data.optionId)
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}
