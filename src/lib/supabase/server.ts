import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { getRequestSupabaseClient } from './request-context'

export async function createClient() {
  // Ação do site chamada pelo app (rota /api/v1/actions): usa a sessão do app
  const fromApp = getRequestSupabaseClient()
  if (fromApp) return fromApp

  const cookieStore = await cookies()

  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll chamado de Server Component — ignorar
          }
        },
      },
    }
  )

  // Inicializa a sessão explicitamente para que as queries DB incluam o JWT
  await client.auth.getSession()

  return client
}
