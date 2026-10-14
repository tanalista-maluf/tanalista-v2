import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { decideJoinRequest } from '@/features/grupos/membership'

const bodySchema = z.object({ decision: z.enum(['APPROVED', 'REJECTED']) })

// Dono do grupo aprova ou recusa um pedido de entrada, pelo app mobile
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: requestId } = await params
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!z.string().uuid().safeParse(requestId).success || !parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const result = await decideJoinRequest(session.supabase, session.user.id, requestId, parsed.data.decision)
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}
