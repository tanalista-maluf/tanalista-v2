import type { Session } from '@supabase/supabase-js'
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react'
import { supabase } from '@/lib/supabase'

type SessionValue = {
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<SessionValue | null>(null)

export function useSession() {
  const value = use(AuthContext)
  if (!value) throw new Error('useSession must be wrapped in a <SessionProvider />')
  return value
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        // Devolve a mensagem de erro, ou null se entrou
        signIn: async (email, password) => {
          const { error } = await supabase.auth.signInWithPassword({ email, password })
          if (!error) return null
          // 400 é credencial recusada; o resto é rede ou servidor fora do ar
          return error.status === 400
            ? 'E-mail ou senha incorretos.'
            : 'Não foi possível entrar. Verifique sua conexão e tente de novo.'
        },
        signOut: async () => {
          await supabase.auth.signOut()
        },
      }}>
      {children}
    </AuthContext.Provider>
  )
}
