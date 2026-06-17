import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getGroupById } from '@/features/grupos/queries'
import { getGroupListings, getUserListingsInGroup } from '@/features/marketplace/queries'
import { ListingCard } from '@/features/marketplace/components/ListingCard'
import { ListingFormSheet } from '@/features/marketplace/components/ListingFormSheet'
import { ChevronLeft, ShoppingBag, Plus } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export default async function MarketplacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const group = await getGroupById(groupId, user.id)
  if (!group) notFound()
  if (!group.is_member) redirect(`/grupos/${groupId}`)

  const [listings, myActive, profileData] = await Promise.all([
    getGroupListings(groupId, user.id),
    getUserListingsInGroup(groupId, user.id),
    supabase.from('profiles').select('wallet_balance').eq('id', user.id).single(),
  ])

  const walletBalance = profileData.data?.wallet_balance ?? 0
  const activeCount = myActive.length

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Nav */}
      <div className="flex items-center gap-3">
        <Link href={`/grupos/${groupId}`} className="text-white/50 hover:text-white">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-white truncate" style={{ fontFamily: 'var(--font-heading)' }}>
            Marketplace
          </h1>
          <p className="text-xs text-white/40 truncate">{group.name}</p>
        </div>
        <ListingFormSheet
          groupId={groupId}
          walletBalance={walletBalance}
          activeCount={activeCount}
        />
      </div>

      {/* Info */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 flex items-center gap-3">
        <ShoppingBag className="size-4 text-white/30 shrink-0" />
        <p className="text-xs text-white/40 leading-relaxed">
          Cada anúncio é de 1 item ou conjunto. Ficam ativos por <span className="text-white/60">30 dias</span>. Limite de{' '}
          <span className="text-white/60">5 anúncios ativos por membro</span> neste grupo. Custo:{' '}
          <span className="text-white/60">R$ 1,00</span> por anúncio (debitado da carteira).
          {activeCount > 0 && <span className="text-primary"> Você tem {activeCount}/5 ativos.</span>}
        </p>
      </div>

      {/* Listagem */}
      {listings.length === 0 ? (
        <div className="card-dark rounded-2xl p-10 text-center space-y-3">
          <ShoppingBag className="size-9 mx-auto text-white/15" />
          <p className="text-white/35 text-sm">Nenhum anúncio ainda.</p>
          <p className="text-xs text-white/20">Seja o primeiro a anunciar no grupo!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {listings.map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isOwner={listing.user_id === user.id}
              walletBalance={walletBalance}
            />
          ))}
        </div>
      )}
    </main>
  )
}
