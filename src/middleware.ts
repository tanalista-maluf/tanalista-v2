import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PROTECTED_PREFIXES = [
  '/home', '/grupos', '/eventos', '/carteira', '/perfil',
  '/notificacoes', '/onboarding', '/financeiro', '/admin', '/configuracoes', '/u/',
]

const AUTH_PREFIXES = ['/login', '/cadastro', '/recuperar-senha']

const PUBLIC_PREFIXES = [
  '/_next', '/api', '/favicon', '/icon-', '/manifest', '/sw.js',
  '/workbox-', '/public', '/e/',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignorar assets estáticos e APIs — zero overhead
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p)) || pathname === '/') {
    return NextResponse.next()
  }

  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
  const isAuth = AUTH_PREFIXES.some(p => pathname.startsWith(p))

  // Só chamar Supabase quando necessário
  if (!isProtected && !isAuth) {
    return NextResponse.next()
  }

  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
