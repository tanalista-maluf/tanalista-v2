import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Vercel Cron: a cada 10 min — cancela participações PIX expiradas
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Participações PENDING com pagamento PIX criado há mais de 35min sem aprovação
  const cutoff = new Date(Date.now() - 35 * 60 * 1000).toISOString()

  const { data: stalePending } = await admin
    .from('participations')
    .select('id, event_id')
    .eq('status', 'PENDING')
    .lte('created_at', cutoff)

  if (!stalePending || stalePending.length === 0) {
    return NextResponse.json({ cancelled: 0 })
  }

  let cancelled = 0

  for (const p of stalePending) {
    // Verificar se o pagamento associado está realmente pendente no gateway
    // Uma inscrição pode ter mais de um pagamento (ex.: cartão recusado e depois PIX)
    const { data: payments } = await admin
      .from('payments')
      .select('status, method')
      .eq('participation_id', p.id)

    // Só cancela se há PIX ainda PENDING e nada aprovado nem cartão em análise
    const open = (payments ?? []).filter((payment) => payment.status === 'PENDING')
    const approved = (payments ?? []).some((payment) => payment.status === 'APPROVED')
    if (approved || open.length === 0 || open.some((payment) => payment.method !== 'PIX')) continue

    await admin
      .from('participations')
      .update({ status: 'CANCELLED' })
      .eq('id', p.id)
      .eq('status', 'PENDING')

    cancelled++
  }

  return NextResponse.json({ cancelled })
}
