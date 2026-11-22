import { NextResponse } from 'next/server'
import { getBearerSession } from '@/lib/supabase/bearer'
import { createGroup } from '@/features/grupos/membership'
import { groupSchema } from '@/features/grupos/schemas'

// Criação de grupo pelo app mobile. Mesma regra da server action do site.
export async function POST(request: Request) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const parsed = groupSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return NextResponse.json({ error: issue.message, field: issue.path[0] }, { status: 400 })
  }

  const result = await createGroup(session.supabase, session.user.id, parsed.data)
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}
