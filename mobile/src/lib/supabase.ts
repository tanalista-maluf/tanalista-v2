import 'expo-sqlite/localStorage/install'
import { createClient } from '@supabase/supabase-js'
import * as Crypto from 'expo-crypto'
import { AppState } from 'react-native'
import type { Database } from '../../../src/types/database'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// O login com Google usa PKCE, e o supabase-js gera o desafio com a Web Crypto,
// que o React Native não traz. Sem isto ele cai para Math.random e desafio em
// texto puro.
if (!globalThis.crypto?.subtle) {
  globalThis.crypto = {
    getRandomValues: Crypto.getRandomValues,
    subtle: { digest: (algorithm: Crypto.CryptoDigestAlgorithm, data: BufferSource) => Crypto.digest(algorithm, data) },
  } as unknown as typeof globalThis.crypto
}

// Leituras vão direto ao Supabase com a sessão do usuário: a RLS e os GRANTs
// por coluna já restringem o que cada um vê. Escritas passam pela API do site
// (src/lib/api.ts), onde vivem as regras de negócio.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
})

// Sem isto o laço de renovação do token roda também com o app em segundo plano
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})
