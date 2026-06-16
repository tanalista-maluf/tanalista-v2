'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function claimEventPayoutAction(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()

  // Verifica que o evento pertence ao organizador e busca dados financeiros
  const { data: event } = await admin
    .from('events')
    .select('id, title, organizer_id, payout_claimed_at')
    .eq('id', eventId)
    .eq('organizer_id', user.id)
    .maybeSingle()

  if (!event) return { error: 'Evento não encontrado.' }
  if (event.payout_claimed_at) return { error: 'Receita deste evento já foi resgatada.' }

  // Busca participações confirmadas para calcular receita líquida
  const { data: partRows } = await admin
    .from('participations')
    .select('id')
    .eq('event_id', eventId)
    .eq('status', 'CONFIRMED')

  const partIds = (partRows ?? []).map((p) => p.id)
  if (partIds.length === 0) return { error: 'Nenhum participante confirmado para resgatar.' }

  const { data: payments } = await admin
    .from('payments')
    .select('amount, platform_fee, gateway_fee')
    .eq('status', 'APPROVED')
    .in('participation_id', partIds)

  const gross        = (payments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0)
  const platformFees = (payments ?? []).reduce((s, p) => s + (p.platform_fee ?? 0), 0)
  const gatewayFees  = (payments ?? []).reduce((s, p) => s + (p.gateway_fee ?? 0), 0)
  const net          = gross - platformFees - gatewayFees

  if (net <= 0) return { error: 'Nenhum valor disponível para resgate.' }

  // Credita na carteira do organizador
  const { error: creditError } = await admin.rpc('wallet_credit', {
    p_user_id:    user.id,
    p_amount:     net,
    p_type:       'DEPOSIT',
    p_description: `Receita do evento: ${event.title}`,
  })

  if (creditError) {
    console.error('[PAYOUT] wallet_credit error:', creditError)
    return { error: 'Erro ao creditar na carteira.' }
  }

  // Marca o evento como resgatado
  await admin
    .from('events')
    .update({ payout_claimed_at: new Date().toISOString() })
    .eq('id', eventId)

  revalidatePath('/financeiro')
  revalidatePath(`/financeiro/${eventId}`)
  revalidatePath('/carteira')

  return { success: true, net_cents: net }
}
