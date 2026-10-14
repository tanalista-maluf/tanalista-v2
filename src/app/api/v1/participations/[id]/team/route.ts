import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { changeTeam } from '@/features/eventos/teams'

const bodySchema = z.object({ teamId: z.string().uuid() })

// Troca de time de quem está confirmado, pelo app mobile. Mesma regra da server action do site.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: participationId } = await params
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!z.string().uuid().safeParse(participationId).success || !parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const result = await changeTeam(session.user.id, participationId, parsed.data.teamId)
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}
