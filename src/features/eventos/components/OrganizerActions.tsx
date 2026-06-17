'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cancelEventAction } from '../actions'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2, X, Pencil, Copy } from 'lucide-react'

interface OrganizerActionsProps {
  event: {
    id: string
    slug?: string | null
    status: string
    title?: string
    group_id?: string
    address?: string
    city?: string
    price?: number
    capacity?: number
    min_participants?: number
  }
}

export function OrganizerActions({ event }: OrganizerActionsProps) {
  const [cancelling, setCancelling] = useState(false)
  const router = useRouter()

  async function handleCancel() {
    setCancelling(true)
    const result = await cancelEventAction(event.id)
    setCancelling(false)
    if (result?.error) toast.error(result.error)
    else { toast.success('Evento cancelado.'); router.refresh() }
  }

  const isCancellable = !['COMPLETED', 'CANCELLED'].includes(event.status)
  const isCompleted = event.status === 'COMPLETED'

  function buildNextEditionUrl() {
    const params = new URLSearchParams()
    if (event.title) params.set('title', event.title)
    if (event.group_id) params.set('group_id', event.group_id)
    if (event.address) params.set('address', event.address)
    if (event.city) params.set('city', event.city)
    if (event.price !== undefined) params.set('price', String(event.price))
    if (event.capacity !== undefined) params.set('capacity', String(event.capacity))
    if (event.min_participants !== undefined) params.set('min_participants', String(event.min_participants))
    return `/eventos/novo?${params.toString()}`
  }

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {isCompleted ? (
        <Link
          href={buildNextEditionUrl()}
          className={cn(buttonVariants({ size: 'sm' }))}
        >
          <Copy className="size-3.5" />
          Próxima edição
        </Link>
      ) : (
        <Link
          href={`/eventos/${event.slug ?? event.id}/editar`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          <Pencil className="size-3.5" />
          Editar
        </Link>
      )}

      {isCancellable && (
        <AlertDialog>
          <AlertDialogTrigger className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-destructive border-destructive/30 hover:bg-destructive/5')}>
            <X className="size-3.5" />
            Cancelar evento
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar este evento?</AlertDialogTitle>
              <AlertDialogDescription>
                Todos os participantes serão notificados. Os pagamentos serão reembolsados como créditos na carteira TáNaLista.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                disabled={cancelling}
                className="bg-destructive text-white hover:bg-destructive/80"
              >
                {cancelling && <Loader2 className="size-4 animate-spin" />}
                Confirmar cancelamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
