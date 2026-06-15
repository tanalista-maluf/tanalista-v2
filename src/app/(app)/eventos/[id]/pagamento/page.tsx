import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PagamentoPixView } from '@/features/participacoes/components/PagamentoPixView'
import { formatPrice } from '@/utils/format'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function PagamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ participation_id?: string; method?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const sp = await searchParams
  const participationId = sp.participation_id
  const method = sp.method as 'PIX' | 'CREDIT_CARD' | undefined

  if (!participationId) redirect(`/eventos/${id}`)

  // Verificar que a participação pertence ao usuário
  const { data: participation } = await supabase
    .from('participations')
    .select('*, events(id, title, price)')
    .eq('id', participationId)
    .eq('user_id', user.id)
    .single()

  if (!participation) notFound()
  if (participation.status === 'CONFIRMED') redirect(`/eventos/${id}?joined=1`)

  const event = (participation as any).events

  return (
    <main className="flex-1 max-w-sm mx-auto w-full px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/eventos/${id}`} className="text-white/50 hover:text-white">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          {method === 'PIX' ? 'Pagamento via PIX' : 'Pagamento'}
        </h1>
      </div>

      <div className="text-center space-y-1">
        <p className="text-white/50 text-sm">{event?.title}</p>
        <p className="text-3xl font-bold text-primary">{formatPrice(event?.price ?? 0)}</p>
      </div>

      {/* Na Fase 7, este componente receberá o QR Code real do Mercado Pago */}
      <PagamentoPixView
        participationId={participationId}
        eventId={id}
        method={method ?? 'PIX'}
      />
    </main>
  )
}
