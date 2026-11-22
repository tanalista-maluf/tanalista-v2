import { AsyncLocalStorage } from 'node:async_hooks'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Cliente Supabase da requisição em andamento, quando ela não vem do navegador
// do site (sessão em cookie) e sim do app mobile (token Bearer). Enquanto a
// rota /api/v1/actions roda uma server action, createClient() devolve este
// cliente em vez de ler cookies: a ação é a mesma do site, com o usuário do app.

const store = new AsyncLocalStorage<SupabaseClient<Database>>()

export function runWithSupabaseClient<T>(client: SupabaseClient<Database>, fn: () => Promise<T>): Promise<T> {
  return store.run(client, fn)
}

export function getRequestSupabaseClient() {
  return store.getStore()
}
