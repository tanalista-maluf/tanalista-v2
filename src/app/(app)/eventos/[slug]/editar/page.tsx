import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { getEventById } from '@/features/eventos/queries'
import { EventForm } from '@/features/eventos/components/EventForm'
import { EventCoupons } from '@/features/cupons/components/EventCoupons'
import Link from 'next/link'
import { ChevronLeft, Ticket } from 'lucide-react'

function centsToPriceString(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

export default async function EditarEventoPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { slug } = await params
  const event = await getEventById(slug, user.id)
  if (!event || !event.is_organizer) notFound()

  const eventSlug = event.slug ?? event.id
  const isLocked = event.status !== 'DRAFT'

  const admin = createAdminClient()
  const { data: eventCoupons } = await admin
    .from('coupons')
    .select('id, code, max_uses, uses_count, active, amount_cents, percent_off')
    .eq('event_id', event.id)
    .order('created_at', { ascending: false })

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/eventos/${eventSlug}`} className="text-white/50 hover:text-white">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          Editar evento
        </h1>
      </div>

      <EventForm
        eventId={event.id}
        groupId={event.group_id}
        isLocked={isLocked}
        defaultValues={{
          title: event.title,
          description: event.description ?? '',
          address: event.address,
          city: event.city,
          category: event.category ?? '',
          price: centsToPriceString(event.price),
          capacity: event.capacity,
          min_participants: event.min_participants,
          starts_at: event.starts_at.slice(0, 16),
          ends_at: event.ends_at?.slice(0, 16) ?? '',
          registration_deadline: event.registration_deadline.slice(0, 16),
          organizer_exempt: event.organizer_exempt,
          visibility: (event.visibility as 'PUBLIC' | 'PRIVATE') ?? 'PUBLIC',
          cancel_before_hours: (event as any).cancel_before_hours ?? null,
          group_id: event.group_id,
        }}
      />

      <div className="card-dark rounded-2xl p-5 space-y-3">
        <h2 className="font-bold text-white flex items-center gap-2">
          <Ticket className="size-4 text-primary" />Cupons do evento
        </h2>
        <EventCoupons eventId={event.id} eventPrice={event.price} coupons={eventCoupons ?? []} />
      </div>
    </main>
  )
}
