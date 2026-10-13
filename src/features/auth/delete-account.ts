import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

// Exclusão de conta pedida pela própria pessoa (app mobile). Eventos,
// pagamentos e movimentos da carteira precisam continuar existindo para os
// outros participantes e para a contabilidade, então a conta não é apagada do
// banco: os dados pessoais são removidos, o perfil vira "Conta excluída" e o
// login é encerrado de forma definitiva (o e-mail fica livre para novo cadastro).
//
// Nada que envolva dinheiro ou outras pessoas é resolvido por conta própria:
// enquanto houver pendência, a exclusão é recusada dizendo o que falta.

export type DeleteAccountResult = { error: string; blockers?: string[] } | { success: true }

export async function deleteAccount(userId: string): Promise<DeleteAccountResult> {
  const admin = createAdminClient()
  const now = new Date().toISOString()

  const [profile, groups, events, participations, withdrawals] = await Promise.all([
    admin.from('profiles').select('wallet_balance').eq('id', userId).single(),
    admin.from('groups').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
    admin
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('organizer_id', userId)
      .neq('status', 'CANCELLED')
      .gte('starts_at', now),
    admin
      .from('participations')
      .select('id, events!inner(starts_at, status)', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['CONFIRMED', 'PENDING'])
      .neq('events.status', 'CANCELLED')
      .gte('events.starts_at', now),
    admin
      .from('withdrawals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'PENDING'),
  ])

  // Sem conseguir conferir as pendências, não exclui
  if (profile.error || !profile.data || groups.error || events.error || participations.error || withdrawals.error) {
    return { error: 'Não foi possível excluir a conta agora. Tente novamente.' }
  }

  const blockers: string[] = []
  if (groups.count) blockers.push('Você é dono de grupo. Exclua seus grupos pelo site antes.')
  if (events.count) blockers.push('Você organiza eventos que ainda vão acontecer. Cancele-os pelo site antes.')
  if (participations.count) blockers.push('Você tem inscrição em eventos que ainda vão acontecer. Cancele-as antes.')
  if (withdrawals.count) blockers.push('Você tem um saque em andamento. Aguarde a conclusão.')
  if (profile.data.wallet_balance > 0) blockers.push('Você tem saldo na carteira. Faça o saque pelo site antes.')

  if (blockers.length > 0) {
    return { error: 'Sua conta ainda tem pendências.', blockers }
  }

  // Dados que só servem à própria pessoa
  const personal = await Promise.all([
    admin.from('push_subscriptions').delete().eq('user_id', userId),
    admin.from('notifications').delete().eq('user_id', userId),
    admin.from('email_reminders').delete().eq('user_id', userId),
    admin.from('group_members').delete().eq('user_id', userId),
    admin.from('group_join_requests').delete().eq('user_id', userId),
    admin.from('event_join_requests').delete().eq('user_id', userId),
    admin.from('waitlist_entries').delete().eq('user_id', userId),
    admin.from('marketplace_listings').delete().eq('user_id', userId),
  ])
  const failed = personal.find((result) => result.error)
  if (failed) {
    console.error('[DELETE ACCOUNT] limpeza', JSON.stringify(failed.error))
    return { error: 'Não foi possível excluir a conta agora. Tente novamente.' }
  }

  await admin.storage
    .from('avatars')
    .remove(['jpg', 'png', 'webp'].map((ext) => `${userId}/avatar.${ext}`))

  const { error: profileError } = await admin
    .from('profiles')
    .update({
      full_name: 'Conta excluída',
      // username é obrigatório e único
      username: `excluido_${randomBytes(6).toString('hex')}`,
      avatar_url: null,
      bio: null,
      city: null,
      phone: null,
      cpf: null,
      mp_account_id: null,
    })
    .eq('id', userId)

  if (profileError) {
    console.error('[DELETE ACCOUNT] perfil', JSON.stringify(profileError))
    return { error: 'Não foi possível excluir a conta agora. Tente novamente.' }
  }

  // Soft delete: a linha em auth.users fica (as chaves estrangeiras dependem
  // dela), mas sem e-mail, senha, identidades ou sessões
  const { error: authError } = await admin.auth.admin.deleteUser(userId, true)
  if (authError) {
    console.error('[DELETE ACCOUNT] auth', JSON.stringify(authError))
    return { error: 'Não foi possível concluir a exclusão. Tente novamente.' }
  }

  return { success: true }
}
