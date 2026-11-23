import { NextResponse } from 'next/server'
import { getPublicGroup } from '@/features/grupos/queries-public'

// Grupo público, sem autenticação — para o app abrir um link tanalista.app/g/[slug]
// mesmo sem sessão (ver src/app/g/[slug]/page.tsx, a mesma função no site)
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const group = await getPublicGroup(slug)
  if (!group) return NextResponse.json({ error: 'Grupo não encontrado.' }, { status: 404 })
  return NextResponse.json(group)
}
