'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ListingSchema } from './schemas'

const LISTING_COST_CENTS = 100  // R$ 1,00
const MAX_LISTINGS_PER_MEMBER = 5
const LISTING_DURATION_DAYS = 30

function parsePriceToCents(price?: string): number | null {
  if (!price || price.trim() === '') return null
  const n = parseFloat(price.replace(',', '.'))
  return isNaN(n) ? null : Math.round(n * 100)
}

export async function createListingAction(groupId: string, data: ListingSchema) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()

  // Verificar membership
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return { error: 'Você precisa ser membro do grupo.' }

  // Verificar limite de anúncios ativos
  const { count } = await admin
    .from('marketplace_listings')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')

  if ((count ?? 0) >= MAX_LISTINGS_PER_MEMBER) {
    return { error: `Limite de ${MAX_LISTINGS_PER_MEMBER} anúncios ativos por grupo atingido.` }
  }

  // Verificar saldo
  const { data: profile } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', user.id)
    .single()

  const hasBalance = profile && profile.wallet_balance >= LISTING_COST_CENTS

  // Calcular expiração
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + LISTING_DURATION_DAYS)

  const status = hasBalance ? 'ACTIVE' : 'DRAFT'

  // Criar anúncio
  const { data: listing, error } = await admin
    .from('marketplace_listings')
    .insert({
      group_id:         groupId,
      user_id:          user.id,
      title:            data.title,
      description:      data.description,
      type:             data.type,
      price:            parsePriceToCents(data.price),
      price_negotiable: data.price_negotiable,
      payment_methods:  data.payment_methods ?? [],
      contact:          data.contact || null,
      photo_url:        data.photo_url || null,
      status,
      published_at:     hasBalance ? new Date().toISOString() : null,
      expires_at:       hasBalance ? expiresAt.toISOString() : null,
    })
    .select('id')
    .single()

  if (error || !listing) return { error: 'Erro ao criar anúncio.' }

  // Debitar carteira se tiver saldo
  if (hasBalance) {
    const { error: debitError } = await admin.rpc('wallet_debit', {
      p_user_id:    user.id,
      p_amount:     LISTING_COST_CENTS,
      p_type:       'PAYMENT',
      p_description: `Anúncio no marketplace: ${data.title}`,
      p_event_id:   null,
    })

    if (debitError) {
      // Reverter para draft se débito falhar
      await admin.from('marketplace_listings').update({ status: 'DRAFT', published_at: null, expires_at: null }).eq('id', listing.id)
      return { error: 'Erro ao debitar saldo. Anúncio salvo como rascunho.' }
    }
  }

  revalidatePath(`/grupos/${groupId}/marketplace`)
  return {
    success: true,
    listingId: listing.id,
    isDraft: !hasBalance,
    insufficientBalance: !hasBalance,
  }
}

export async function publishDraftListingAction(listingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()

  const { data: listing } = await admin
    .from('marketplace_listings')
    .select('id, group_id, title, status, user_id')
    .eq('id', listingId)
    .eq('user_id', user.id)
    .single()

  if (!listing) return { error: 'Anúncio não encontrado.' }
  if (listing.status !== 'DRAFT') return { error: 'Anúncio não está em rascunho.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', user.id)
    .single()

  if (!profile || profile.wallet_balance < LISTING_COST_CENTS) {
    return { error: `Saldo insuficiente. Necessário R$ ${(LISTING_COST_CENTS / 100).toFixed(2)}.` }
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + LISTING_DURATION_DAYS)

  const { error: debitError } = await admin.rpc('wallet_debit', {
    p_user_id:    user.id,
    p_amount:     LISTING_COST_CENTS,
    p_type:       'PAYMENT',
    p_description: `Anúncio no marketplace: ${listing.title}`,
    p_event_id:   null,
  })

  if (debitError) return { error: 'Erro ao debitar saldo.' }

  await admin.from('marketplace_listings').update({
    status:       'ACTIVE',
    published_at: new Date().toISOString(),
    expires_at:   expiresAt.toISOString(),
  }).eq('id', listingId)

  revalidatePath(`/grupos/${listing.group_id}/marketplace`)
  return { success: true }
}

export async function deleteListingAction(listingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()

  const { data: listing } = await admin
    .from('marketplace_listings')
    .select('id, group_id, user_id')
    .eq('id', listingId)
    .single()

  if (!listing) return { error: 'Anúncio não encontrado.' }
  if (listing.user_id !== user.id) return { error: 'Sem permissão.' }

  await admin.from('marketplace_listings').update({ status: 'DELETED' }).eq('id', listingId)

  revalidatePath(`/grupos/${listing.group_id}/marketplace`)
  return { success: true }
}
