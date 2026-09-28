import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Só aceita caminhos relativos internos — evita open redirect via ?next=//evil.com
function safeRedirect(path: string | null): string | undefined {
  if (!path) return undefined
  if (!path.startsWith('/') || path.startsWith('//')) return undefined
  return path
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type') // 'recovery' | undefined
  const next = safeRedirect(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/perfil?tab=senha`)
      }

      // Verificar se onboarding foi concluído
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()

        if (!profile?.onboarding_completed) {
          return NextResponse.redirect(`${origin}/onboarding${next ? `?next=${encodeURIComponent(next)}` : ''}`)
        }
      }

      return NextResponse.redirect(`${origin}${next ?? '/home'}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link_invalido`)
}
