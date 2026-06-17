import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getEventById } from '@/features/eventos/queries'
import { InscricaoForm } from '@/features/participacoes/components/InscricaoForm'
import { EventStatusBadge } from '@/features/eventos/components/EventStatusBadge'
import { formatPrice, formatDateTime } from '@/utils/format'
import { Calendar, MapPin, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default async function InscricaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ waitlist?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { slug } = await params
  const sp = await searchParams
  const wantWaitlist = sp.waitlist === '1'

  const event = await getEventById(slug, user.id)
  if (!event) notFound()

  const eventSlug = event.slug ?? event.id

  if (event.status !== 'OPEN') redirect(`/eventos/${eventSlug}`)
  if (event.is_organizer && !event.organizer_exempt) redirect(`/eventos/${eventSlug}`)

  // Buscar saldo da carteira e times do evento em paralelo
  const [{ data: profile }, { data: teamsRaw }] = await Promise.all([
    supabase.from('profiles').select('wallet_balance').eq('id', user.id).single(),
    supabase.from('event_teams').select('id, name, capacity, position').eq('event_id', event.id).order('position'),
  ])

  const walletBalance = (profile as any)?.wallet_balance ?? 0

  // Enriquecer times com contagem de confirmados
  let teams: { id: string; name: string; capacity: number; confirmed_count: number }[] = []
  if (teamsRaw && teamsRaw.length > 0) {
    const counts = await Promise.all(
      teamsRaw.map(async (t) => {
        const { count } = await supabase
          .from('participations')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', t.id)
          .eq('status', 'CONFIRMED')
        return { ...t, confirmed_count: count ?? 0 }
      })
    )
    teams = counts
  }

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/eventos/${eventSlug}`} className="text-white/50 hover:text-white">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          {wantWaitlist ? 'Entrar na fila' : 'Confirmar inscrição'}
        </h1>
      </div>

      {/* Resumo do evento */}
      <div className="card-dark rounded-2xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold">{event.title}</h2>
          <EventStatusBadge status={event.status} />
        </div>
        <div className="space-y-1.5 text-sm text-white/50">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-primary shrink-0" />
            <span>{formatDateTime(event.starts_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-primary shrink-0" />
            <span>{event.city}</span>
          </div>
        </div>
        <div className="border-t pt-3 flex items-center justify-between">
          <span className="text-sm text-white/50">Valor da inscrição</span>
          <span className="text-lg font-bold text-primary">{formatPrice(event.price)}</span>
        </div>
      </div>

      {/* Formulário de inscrição */}
      <InscricaoForm
        eventId={event.id}
        eventPrice={event.price}
        walletBalance={walletBalance}
        isOrganizer={event.is_organizer}
        organizerExempt={event.organizer_exempt}
        wantWaitlist={wantWaitlist}
        isFull={event.confirmed_count >= event.capacity}
        teams={teams.length > 0 ? teams : undefined}
      />
    </main>
  )
}
