'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cancelEventAction } from '../actions'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
    confirmed_count?: number
  }
}

// A palavra que libera o cancelamento, como no app (cancel-event-dialog)
const CONFIRM_WORD = 'CANCELAR'

export function OrganizerActions({ event }: OrganizerActionsProps) {
  const [cancelling, setCancelling] = useState(false)
  const [typed, setTyped] = useState('')
  const ready = typed.trim().toUpperCase() === CONFIRM_WORD
  const router = useRouter()

  async function handleCancel() {
    if (!ready) return
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
      {!isCompleted && (
        <Link
          href={`/eventos/${event.slug ?? event.id}/editar`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          <Pencil className="size-3.5" />
          Editar
        </Link>
      )}
      <Link
        href={buildNextEditionUrl()}
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-white/60')}
      >
        <Copy className="size-3.5" />
        {isCompleted ? 'Próxima edição' : 'Duplicar'}
      </Link>

      {isCancellable && (
        <AlertDialog onOpenChange={(open) => { if (!open) setTyped('') }}>
          <AlertDialogTrigger className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-destructive border-destructive/30 hover:bg-destructive/5')}>
            <X className="size-3.5" />
            Cancelar evento
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar este evento?</AlertDialogTitle>
              <AlertDialogDescription>
                {event.confirmed_count
                  ? `${event.confirmed_count} ${event.confirmed_count === 1 ? 'inscrito será avisado' : 'inscritos serão avisados'}. `
                  : 'Ninguém está inscrito ainda. '}
                Quem pagou recebe o valor de volta como crédito na carteira TáNaLista. Não dá para desfazer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {/* Digitar a palavra evita cancelar por engano com um clique a mais */}
            <div className="space-y-2">
              <label htmlFor="confirm-cancel" className="text-sm text-white/50">
                Para confirmar, digite <strong className="text-white">{CONFIRM_WORD}</strong>
              </label>
              <Input
                id="confirm-cancel"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCancel() }}
                placeholder={CONFIRM_WORD}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                disabled={cancelling || !ready}
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
