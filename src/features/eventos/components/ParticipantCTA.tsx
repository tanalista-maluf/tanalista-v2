'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CheckCircle, Clock, ListPlus, Loader2 } from 'lucide-react'

interface ParticipantCTAProps {
  event: {
    id: string
    slug?: string | null
    status: string
    price: number
    user_participation_status: string | null
    user_participation_id: string | null
    waitlist_position: number | null
    waitlist_count: number
  }
  canJoin: boolean
  isFull: boolean
  userId: string
}

export function ParticipantCTA({ event, canJoin, isFull }: ParticipantCTAProps) {
  const { user_participation_status, user_participation_id, waitlist_position } = event
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function navigate(href: string) {
    startTransition(() => { router.push(href) })
  }

  // Já confirmado
  if (user_participation_status === 'CONFIRMED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
        <CheckCircle className="size-3.5" />
        Inscrito
      </span>
    )
  }

  // Pagamento PIX pendente
  if (user_participation_status === 'PENDING') {
    return (
      <Link
        href={`/eventos/${event.slug ?? event.id}/pagamento?participation_id=${user_participation_id}&method=PIX`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 hover:bg-yellow-400/20 transition-colors"
      >
        <Clock className="size-3.5" />
        Pagar PIX
      </Link>
    )
  }

  // Na fila de espera
  if (waitlist_position) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">
        <ListPlus className="size-3.5" />
        Fila #{waitlist_position}
      </span>
    )
  }

  // Evento encerrado para inscrições
  if (!['OPEN'].includes(event.status)) {
    return (
      <span className="text-xs text-white/50">
        Inscrições encerradas
      </span>
    )
  }

  // Pode se inscrever
  if (canJoin) {
    return (
      <button
        onClick={() => navigate(`/eventos/${event.slug ?? event.id}/inscricao`)}
        disabled={isPending}
        className={cn(buttonVariants(), 'min-w-[110px]')}
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Inscrever-se'}
      </button>
    )
  }

  // Evento cheio — fila sempre disponível
  if (isFull) {
    return (
      <button
        onClick={() => navigate(`/eventos/${event.slug ?? event.id}/inscricao?waitlist=1`)}
        disabled={isPending}
        className={cn(buttonVariants({ variant: 'outline' }), 'min-w-[110px]')}
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <><ListPlus className="size-4" />Entrar na fila</>}
      </button>
    )
  }

  return <span className="text-xs text-white/50">Vagas esgotadas</span>
}
