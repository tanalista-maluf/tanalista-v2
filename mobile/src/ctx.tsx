import type { Session } from '@supabase/supabase-js'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { createContext, use, useCallback, useEffect, useState, type PropsWithChildren } from 'react'
import { unregisterPush } from '@/lib/push'
import { apiPost, apiUrl } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export type Profile = {
  full_name: string
  username: string
  city: string | null
  bio: string | null
  avatar_url: string | null
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
  signInWithApple: () => Promise<string | null>
  // Sempre "enviado" para e-mail bem formado: não revela se a conta existe
  requestPasswordReset: (email: string) => Promise<string | null>
  // A pessoa voltou pelo link de recuperação e ainda precisa definir a senha nova
  recovering: boolean
  updatePassword: (password: string) => Promise<string | null>
  signOut: () => Promise<void>
  // Depois de excluir a conta: a sessão já não existe no servidor
  forgetSession: () => Promise<void>
  refreshProfile: () => Promise<void>
}

// Precisa estar na lista de Redirect URLs do Supabase Auth. É para onde voltam
// o login com Google e o link do e-mail de recuperação de senha.
const OAUTH_REDIRECT = 'tanalista://auth/callback'

// Troca o código do retorno pela sessão. O mesmo retorno pode chegar por dois
// caminhos (quem abriu o navegador e a rota auth/callback), e o código só vale
// uma vez: a segunda chamada reaproveita a primeira.
const exchanges = new Map<string, Promise<{ ok: boolean; recovery: boolean }>>()

export function exchangeAuthCode(code: string) {
  let pending = exchanges.get(code)
  if (!pending) {
    pending = supabase.auth
      .exchangeCodeForSession(code)
      // redirectType vem na resposta, mas falta na tipagem desta versão do supabase-js
      .then(({ data, error }) => ({
        ok: !error,
        recovery: (data as { redirectType?: string | null } | null)?.redirectType === 'recovery',
      }))
    exchanges.set(code, pending)
  }
  return pending
}

const AuthContext = createContext<SessionValue | null>(null)

export function useSession() {
  const value = use(AuthContext)
  if (!value) throw new Error('useSession must be wrapped in a <SessionProvider />')
  return value
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('full_name, username, city, bio, avatar_url, onboarding_completed')
    .eq('id', userId)
    .maybeSingle()
  return data
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [recovering, setRecovering] = useState(false)
  // Perfil de qual usuário já foi buscado: enquanto não é o da sessão atual, carregando
  const [loaded, setLoaded] = useState<{ userId: string; profile: Profile | null } | null>(null)
  const userId = session?.user.id

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      if (!next) setRecovering(false)
      setSession(next)
    })
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

          const { ok } = await exchangeAuthCode(code)
          return ok ? null : 'Não foi possível entrar com o Google. Tente novamente.'
        },
        // iPhone: botão nativo (Face ID) e o token vai direto ao Supabase.
        // Android: página da Apple no navegador, como no Google.
        signInWithApple: async () => {
          if (process.env.EXPO_OS !== 'ios') {
            const { data, error } = await supabase.auth.signInWithOAuth({
              provider: 'apple',
              options: { redirectTo: OAUTH_REDIRECT, skipBrowserRedirect: true, scopes: 'name email' },
            })
            if (error || !data.url) return 'Não foi possível conectar à Apple. Tente novamente.'
            const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT)
            if (result.type !== 'success') return null
            const code = Linking.parse(result.url).queryParams?.code
            if (typeof code !== 'string') return 'A Apple não confirmou o acesso. Tente novamente.'
            const { ok } = await exchangeAuthCode(code)
            return ok ? null : 'Não foi possível entrar com a Apple. Tente novamente.'
          }

          // O nonce liga o token desta tentativa ao pedido: a Apple recebe o
          // hash e o Supabase confere com o original
          const rawNonce = Crypto.randomUUID()
          const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce)
          let credential: AppleAuthentication.AppleAuthenticationCredential
          try {
            credential = await AppleAuthentication.signInAsync({
              requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
              ],
              nonce: hashedNonce,
            })
          } catch (err) {
            // A pessoa fechou a janela da Apple
            if ((err as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null
            return 'Não foi possível entrar com a Apple. Tente novamente.'
          }
          if (!credential.identityToken) return 'A Apple não confirmou o acesso. Tente novamente.'

          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: credential.identityToken,
            nonce: rawNonce,
          })
          if (error) return 'Não foi possível entrar com a Apple. Tente novamente.'

          // A Apple só manda o nome na primeira vez, e fora do token
          const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ')
          if (name) {
            await supabase.auth.updateUser({ data: { full_name: name } })
            await apiPost('/api/v1/me/name', { full_name: name })
            await refreshProfile()
          }
          return null
        },
        requestPasswordReset: async (email) => {
          const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: OAUTH_REDIRECT })
          if (!error) return null
          if (error.status === 429) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
          return error.status
            ? 'Erro ao enviar e-mail. Tente novamente.'
            : 'Não foi possível enviar. Verifique sua conexão e tente de novo.'
        },
        recovering,
        updatePassword: async (password) => {
          const { error } = await supabase.auth.updateUser({ password })
          if (!error) {
            setRecovering(false)
            return null
          }
          if (error.code === 'same_password') return 'A senha nova precisa ser diferente da atual.'
          if (error.code === 'weak_password') return 'Senha fraca. Use ao menos 8 caracteres, com maiúscula e número.'
          return error.status
            ? 'Erro ao salvar a senha. Tente novamente.'
            : 'Não foi possível salvar. Verifique sua conexão e tente de novo.'
        },
        signOut: async () => {
          // Antes de sair: tirar o aparelho precisa da sessão
          await unregisterPush()
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
