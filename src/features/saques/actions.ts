'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) throw new Error('Acesso negado.')
  return user
}

export async function confirmWithdrawalAction(withdrawalId: string, note?: string) {
  await assertAdmin()
  const admin = createAdminClient()

  const { data: w } = await admin
    .from('withdrawals')
    .select('*')
    .eq('id', withdrawalId)
    .eq('status', 'PENDING')
    .maybeSingle()

  if (!w) return { error: 'Saque não encontrado ou já processado.' }

  await admin
    .from('withdrawals')
    .update({ status: 'PAID', processed_at: new Date().toISOString(), admin_note: note ?? null })
    .eq('id', withdrawalId)

  revalidatePath('/admin/saques')
  return { success: true }
}

export async function cancelWithdrawalAction(withdrawalId: string, note?: string) {
  await assertAdmin()
  const admin = createAdminClient()

  const { data: w } = await admin
    .from('withdrawals')
    .select('*')
    .eq('id', withdrawalId)
    .eq('status', 'PENDING')
    .maybeSingle()

  if (!w) return { error: 'Saque não encontrado ou já processado.' }

  // Estornar valor na carteira do usuário
  const { error: creditError } = await admin.rpc('wallet_credit', {
    p_user_id: w.user_id,
    p_amount: w.amount_cents,
    p_type: 'REFUND',
    p_description: 'Saque cancelado — valor estornado',
  })

  if (creditError) return { error: 'Erro ao estornar saldo: ' + creditError.message }

  await admin
    .from('withdrawals')
    .update({ status: 'CANCELLED', processed_at: new Date().toISOString(), admin_note: note ?? null })
    .eq('id', withdrawalId)

  revalidatePath('/admin/saques')
  return { success: true }
}
