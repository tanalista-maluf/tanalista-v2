'use client'

import { useState } from 'react'
import { cancelParticipationAction } from '../actions'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2, X } from 'lucide-react'

export function CancelParticipationButton({
  participationId,
  eventId,
  eventPrice,
  cancelBeforeHours,
}: {
  participationId: string
  eventId: string
  eventPrice: number
  cancelBeforeHours?: number | null
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleCancel() {
    setLoading(true)
    const result = await cancelParticipationAction(participationId)
    setLoading(false)

    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Inscrição cancelada.')
      router.refresh()
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger className="inline-flex items-center gap-1.5 text-xs text-destructive hover:underline">
        <X className="size-3.5" />
        Cancelar inscrição
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar inscrição?</AlertDialogTitle>
          <AlertDialogDescription>
            Você perderá sua vaga neste evento.
            {eventPrice > 0 && ' O valor que você pagou volta integralmente como crédito na sua carteira TáNaLista — você pode usar o saldo para se inscrever em outros eventos ou solicitar o saque quando quiser.'}
            {cancelBeforeHours !== null && cancelBeforeHours !== undefined && cancelBeforeHours > 0 && (
              <span className="block mt-1 text-yellow-400/80">
                Política do organizador: cancelamento com reembolso até {cancelBeforeHours}h antes do evento.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Manter inscrição</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={loading}
            className="bg-destructive text-white hover:bg-destructive/80"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Confirmar cancelamento
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
