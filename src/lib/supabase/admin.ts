import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Apenas para uso em Edge Functions / API Routes que precisam bypassar RLS
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
