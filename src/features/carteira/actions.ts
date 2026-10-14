'use server'

import { createClient } from '@/lib/supabase/server'
import { requestWithdrawal, type WithdrawalInput } from './wallet'

export type { WithdrawalInput }

export async function requestWithdrawalAction(input: WithdrawalInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  return requestWithdrawal(user, input)
}
