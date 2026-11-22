import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { changeWaitlistTeam } from '@/features/fila/waitlist'

const bodySchema = z.object({ teamId: z.string().uuid() })

// Troca o time de quem aguarda na fila de espera, pelo app mobile
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: waitlistId } = await params
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!z.string().uuid().safeParse(waitlistId).success || !parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const result = await changeWaitlistTeam(session.user.id, waitlistId, parsed.data.teamId)
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}
