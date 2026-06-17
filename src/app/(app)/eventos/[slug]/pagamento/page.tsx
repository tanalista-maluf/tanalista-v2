import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PagamentoPixView } from '@/features/participacoes/components/PagamentoPixView'
import { getEventById } from '@/features/eventos/queries'
import { formatPrice } from '@/utils/format'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function PagamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ participation_id?: string; method?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { slug } = await params
  const sp = await searchParams
  const participationId = sp.participation_id
  const method = sp.method as 'PIX' | 'CREDIT_CARD' | undefined

  if (!participationId) redirect(`/eventos/${slug}`)

  // Verificar que a participação pertence ao usuário
  const { data: participation } = await supabase
    .from('participations')
    .select('*, events(id, title, price, slug)')
    .eq('id', participationId)
    .eq('user_id', user.id)
    .single()

  if (!participation) notFound()

  const eventData = (participation as any).events
  const eventSlug = eventData?.slug ?? eventData?.id ?? slug
  if (participation.status === 'CONFIRMED') redirect(`/eventos/${eventSlug}?joined=1`)

  return (
    <main className="flex-1 max-w-sm mx-auto w-full px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/eventos/${eventSlug}`} className="text-white/50 hover:text-white">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          {method === 'PIX' ? 'Pagamento via PIX' : 'Pagamento'}
        </h1>
      </div>

      <div className="text-center space-y-1">
        <p className="text-white/50 text-sm">{eventData?.title}</p>
        <p className="text-3xl font-bold text-primary">{formatPrice(eventData?.price ?? 0)}</p>
      </div>

      <PagamentoPixView
        participationId={participationId}
        eventId={eventSlug}
        method={method ?? 'PIX'}
      />
    </main>
  )
}
