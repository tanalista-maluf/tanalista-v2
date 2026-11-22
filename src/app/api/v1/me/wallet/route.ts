import { NextResponse } from 'next/server'
import { getBearerSession } from '@/lib/supabase/bearer'
import { createAdminClient } from '@/lib/supabase/admin'

// Saldo da carteira de quem chama, pelo app mobile. A coluna wallet_balance não
// é legível pela API do Supabase, então sai por aqui.
export async function GET(request: Request) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { data: profile } = await createAdminClient()
    .from('profiles')
    .select('wallet_balance')
    .eq('id', session.user.id)
    .single()

  return NextResponse.json({ balance: profile?.wallet_balance ?? 0 })
}
