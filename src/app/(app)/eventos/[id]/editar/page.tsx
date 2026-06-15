import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getEventById } from '@/features/eventos/queries'
import { EventForm } from '@/features/eventos/components/EventForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

function centsToPriceString(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

export default async function EditarEventoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const event = await getEventById(id, user.id)
  if (!event || !event.is_organizer) notFound()

  const isLocked = event.status !== 'DRAFT'

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/eventos/${id}`} className="text-white/50 hover:text-white">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          Editar evento
        </h1>
      </div>

      <EventForm
        eventId={id}
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
          group_id: event.group_id,
        }}
      />
    </main>
  )
}
