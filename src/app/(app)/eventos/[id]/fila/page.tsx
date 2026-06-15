import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WaitlistManagement } from '@/features/fila/components/WaitlistManagement'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

export default async function WaitlistPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase
    .from('events')
    .select('id, title, organizer_id')
    .eq('id', id)
    .single()

  if (!event) notFound()
  if (event.organizer_id !== user.id) redirect(`/eventos/${id}`)

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/eventos/${id}`} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Fila de espera</h1>
          <p className="text-sm text-white/50">{event.title}</p>
        </div>
      </div>

      <WaitlistManagement eventId={id} />
    </main>
  )
}
