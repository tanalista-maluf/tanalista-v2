import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { submitRating } from '@/features/eventos/engagement'

const bodySchema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().max(500).default('') })

// Avaliação de um evento concluído, pelo app mobile. Mesma regra da server action do site.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: eventId } = await params
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!z.string().uuid().safeParse(eventId).success || !parsed.success) {
    return NextResponse.json({ error: 'Avaliação inválida' }, { status: 400 })
  }

  const result = await submitRating(session.user.id, eventId, parsed.data.rating, parsed.data.comment)
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}
