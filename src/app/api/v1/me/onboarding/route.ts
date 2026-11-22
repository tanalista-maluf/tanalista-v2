import { NextResponse } from 'next/server'
import { getBearerSession } from '@/lib/supabase/bearer'
import { completeOnboarding } from '@/features/auth/onboarding'

// Conclusão do cadastro (username, cidade e WhatsApp), pelo app mobile.
export async function POST(request: Request) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const result = await completeOnboarding(session.user.id, body)

  if ('error' in result) return NextResponse.json(result, { status: 400 })
  return NextResponse.json(result)
}
