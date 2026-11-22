import { NextResponse } from 'next/server'
import { getBearerSession } from '@/lib/supabase/bearer'
import { getOwnProfile, updateProfile } from '@/features/perfil/profile'

// Dados pessoais de quem está logado no app mobile, incluindo o telefone, que
// o app não consegue ler direto do banco
export async function GET(request: Request) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const profile = await getOwnProfile(session.user.id)
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
  return NextResponse.json(profile)
}

// Mesma regra da server action do site
export async function POST(request: Request) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const result = await updateProfile(session.user.id, await request.json().catch(() => ({})))
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}
