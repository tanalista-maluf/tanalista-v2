'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { removeParticipantAction } from '../actions'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Props {
  participationId: string
  eventId: string
}

export function RemoveParticipantButton({ participationId, eventId }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleRemove() {
    setLoading(true)
    const result = await removeParticipantAction(participationId, eventId)
    setLoading(false)
    if (result?.error) toast.error(result.error)
    else toast.success('Participante removido.')
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger>
        <span className="size-7 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0">
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
        </span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover participante?</AlertDialogTitle>
          <AlertDialogDescription>
            O participante será removido e receberá reembolso na carteira (se aplicável).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemove}
            className="bg-destructive text-white hover:bg-destructive/80"
          >
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
