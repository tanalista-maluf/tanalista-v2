import { NextResponse } from 'next/server'
import { getPublicEvent } from '@/features/eventos/queries-public'

// Evento público, sem autenticação — para o app abrir um link tanalista.app/e/[slug]
// mesmo sem sessão (ver src/app/e/[slug]/page.tsx, a mesma função no site)
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getPublicEvent(slug)
  if (!event) return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 })
  return NextResponse.json(event)
}
