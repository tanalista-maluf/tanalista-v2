import { NextResponse } from 'next/server'
import { getBearerSession } from '@/lib/supabase/bearer'
import { getNotificationPreferences, setNotificationPreferences } from '@/features/notificacoes/preferences'

// Preferências de aviso de quem está logado no app mobile
export async function GET(request: Request) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const preferences = await getNotificationPreferences(session.user.id)
  if (!preferences) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
  return NextResponse.json(preferences)
}

export async function POST(request: Request) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const result = await setNotificationPreferences(session.user.id, await request.json().catch(() => ({})))
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}
