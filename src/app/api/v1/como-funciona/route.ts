import { NextResponse } from 'next/server'
import { CONTACT_EMAIL, HOW_IT_WORKS } from '@/features/ajuda/como-funciona'

// Conteúdo da tela "Como funciona" do app, o mesmo da página /como-funciona.
// Público: é o mesmo texto que o site mostra para qualquer visitante.
export function GET() {
  return NextResponse.json(
    { sections: HOW_IT_WORKS, contactEmail: CONTACT_EMAIL },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
  )
}
