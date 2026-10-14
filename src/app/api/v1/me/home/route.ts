import { NextResponse } from 'next/server'
import { getBearerSession } from '@/lib/supabase/bearer'
import { getGroupActivity } from '@/features/home/activity'

// O que a tela inicial do app não consegue ler direto do banco: a atividade
// recente nos grupos da pessoa (inscrições de outras pessoas)
export async function GET(request: Request) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  return NextResponse.json({ activity: await getGroupActivity(session.supabase, session.user.id) })
}
