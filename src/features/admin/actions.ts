'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { purgeCancelledEvents } from './cleanup'
import { isAdminEmail } from './queries'

// Botão "Limpar eventos cancelados" do painel de admin do site
export async function purgeCancelledEventsAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return { error: 'Acesso negado.' }

  const result = await purgeCancelledEvents()
  revalidatePath('/admin/eventos')
  return result
}
