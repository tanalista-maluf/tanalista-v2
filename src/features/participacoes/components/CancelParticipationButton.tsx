'use client'

import { useState } from 'react'
import { cancelParticipationAction } from '../actions'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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
  const [ackFee, setAckFee] = useState(false)

  async function handleCancel() {
    if (!ackFee && eventPrice > 0) {
      toast.error('Confirme que está ciente do desconto da taxa do gateway.')
      return
    }
    setLoading(true)
    const result = await cancelParticipationAction(participationId, ackFee || eventPrice === 0)
    setLoading(false)

    if (result?.error) {
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
            {eventPrice > 0 && ' O valor será reembolsado como crédito na sua carteira TáNaLista.'}
            {cancelBeforeHours !== null && cancelBeforeHours !== undefined && cancelBeforeHours > 0 && (
              <span className="block mt-1 text-yellow-400/80">
                Política do organizador: cancelamento com reembolso até {cancelBeforeHours}h antes do evento.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {eventPrice > 0 && (
          <div className="flex items-start gap-3 rounded-lg bg-yellow-400/5 border border-yellow-400/20 p-3 mt-2">
            <Checkbox
              id="ack-fee"
              checked={ackFee}
              onCheckedChange={(v) => setAckFee(!!v)}
            />
            <Label htmlFor="ack-fee" className="text-xs text-yellow-400 cursor-pointer leading-relaxed">
              Estou ciente de que a taxa do gateway de pagamento (PIX ~0,99% / Cartão ~2,99%)
              será descontada do valor reembolsado.
            </Label>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Manter inscrição</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={loading || (eventPrice > 0 && !ackFee)}
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
