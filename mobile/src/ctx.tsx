import type { Session } from '@supabase/supabase-js'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { createContext, use, useCallback, useEffect, useState, type PropsWithChildren } from 'react'
import { apiUrl } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export type Profile = {
  full_name: string
  username: string
  city: string | null
  onboarding_completed: boolean
}

type SessionValue = {
  session: Session | null
  // null também quando o perfil não pôde ser lido (sem rede)
  profile: Profile | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (fullName: string, email: string, password: string) => Promise<{ error: string } | { confirmEmail: boolean }>
  signInWithGoogle: () => Promise<string | null>
  signOut: () => Promise<void>
  // Depois de excluir a conta: a sessão já não existe no servidor
  forgetSession: () => Promise<void>
  refreshProfile: () => Promise<void>
}

// Precisa estar na lista de Redirect URLs do Supabase Auth
const OAUTH_REDIRECT = 'tanalista://auth/callback'

const AuthContext = createContext<SessionValue | null>(null)

export function useSession() {
  const value = use(AuthContext)
  if (!value) throw new Error('useSession must be wrapped in a <SessionProvider />')
  return value
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('full_name, username, city, onboarding_completed')
    .eq('id', userId)
    .maybeSingle()
  return data
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  // Perfil de qual usuário já foi buscado: enquanto não é o da sessão atual, carregando
  const [loaded, setLoaded] = useState<{ userId: string; profile: Profile | null } | null>(null)
  const userId = session?.user.id

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!userId) return
    const profile = await fetchProfile(userId)
    setLoaded({ userId, profile })
  }, [userId])

  useEffect(() => {
    if (!userId) return
    let active = true
    fetchProfile(userId).then((profile) => active && setLoaded({ userId, profile }))
    return () => {
      active = false
    }
  }, [userId])

  const profileReady = !userId || loaded?.userId === userId

  return (
    <AuthContext.Provider
      value={{
        session,
        profile: userId && loaded?.userId === userId ? loaded.profile : null,
        isLoading: sessionLoading || !profileReady,
        refreshProfile,
        // Devolve a mensagem de erro, ou null se entrou
        signIn: async (email, password) => {
          const { error } = await supabase.auth.signInWithPassword({ email, password })
          if (!error) return null
          if (error.code === 'email_not_confirmed') {
            return 'Confirme seu e-mail pelo link que enviamos antes de entrar.'
          }
          // 400 é credencial recusada; o resto é rede ou servidor fora do ar
          return error.status === 400
            ? 'E-mail ou senha incorretos.'
            : 'Não foi possível entrar. Verifique sua conexão e tente de novo.'
        },
        signUp: async (fullName, email, password) => {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName },
              // O link do e-mail abre uma página do site que manda voltar ao app
              emailRedirectTo: `${apiUrl}/app/email-confirmado`,
            },
          })
          // Com confirmação de e-mail ligada, o Supabase não diz que o e-mail já
          // existe: devolve um usuário sem identidades
          if (error?.code === 'user_already_exists' || data.user?.identities?.length === 0) {
            return { error: 'Este e-mail já está cadastrado.' }
          }
          if (error) {
            return {
              error: error.status
                ? 'Erro ao criar conta. Tente novamente.'
                : 'Não foi possível criar a conta. Verifique sua conexão e tente de novo.',
            }
          }
          // Sem sessão, falta confirmar o e-mail
          return { confirmEmail: !data.session }
        },
        // Devolve a mensagem de erro, ou null se entrou ou se a pessoa desistiu
        signInWithGoogle: async () => {
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: OAUTH_REDIRECT,
              skipBrowserRedirect: true,
              queryParams: { prompt: 'select_account' },
            },
          })
          if (error || !data.url) return 'Não foi possível conectar ao Google. Tente novamente.'

          const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT)
          if (result.type !== 'success') return null

          const code = Linking.parse(result.url).queryParams?.code
          if (typeof code !== 'string') return 'O Google não confirmou o acesso. Tente novamente.'

          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          return exchangeError ? 'Não foi possível entrar com o Google. Tente novamente.' : null
        },
        signOut: async () => {
          await supabase.auth.signOut()
        },
        forgetSession: async () => {
          await supabase.auth.signOut({ scope: 'local' })
        },
      }}>
      {children}
    </AuthContext.Provider>
  )
}
