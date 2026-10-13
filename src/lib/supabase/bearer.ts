import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Autenticação das rotas /api/v1, usadas pelo app mobile: o token de acesso do
// Supabase vem no cabeçalho Authorization em vez de em cookie. Devolve o
// usuário e um cliente que age como ele (a RLS vale normalmente), ou null.
export async function getBearerSession(request: Request) {
  const header = request.headers.get('authorization') ?? ''
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
  if (!token) return null

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )

  const { data: { user } } = await supabase.auth.getUser(token)
  return user ? { supabase, user } : null
}
