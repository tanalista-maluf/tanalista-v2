import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { REPORT_REASONS, submitReport } from '@/features/eventos/engagement'

const bodySchema = z.object({
  targetType: z.enum(['EVENT', 'GROUP']),
  targetId: z.string().uuid(),
  reason: z.enum(REPORT_REASONS),
  description: z.string().max(1000).default(''),
})

// Denúncia de evento ou grupo, pelo app mobile. Mesma regra da server action do site.
export async function POST(request: Request) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

  const { targetType, targetId, reason, description } = parsed.data
  const result = await submitReport(session.supabase, session.user.id, targetType, targetId, reason, description)
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}
