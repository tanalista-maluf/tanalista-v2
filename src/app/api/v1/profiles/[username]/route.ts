import { NextResponse } from 'next/server'
import { getBearerSession } from '@/lib/supabase/bearer'
import { getPublicProfile } from '@/features/perfil/profile'

// Perfil público de uma pessoa, para o app mobile
export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { username } = await params
  const result = /^[a-z0-9_.]{1,40}$/i.test(username) ? await getPublicProfile(username) : null
  if (!result) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
  return NextResponse.json(result)
}
