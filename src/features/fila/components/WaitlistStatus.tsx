'use client'

import { useState } from 'react'
import { Clock, Bell, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { leaveWaitlistAction, confirmWaitlistSpotAction } from '@/features/fila/actions'
import { toast } from 'sonner'
import { formatDateTime } from '@/utils/format'

interface WaitlistEntry {
  id: string
  status: string
  position: number
  notified_at: string | null
  expires_at: string | null
}

interface WaitlistStatusProps {
  entry: WaitlistEntry
  eventId: string
  eventPrice: number
}

export function WaitlistStatus({ entry, eventId, eventPrice }: WaitlistStatusProps) {
  const [leaving, setLeaving]      = useState(false)
  const [confirming, setConfirming] = useState(false)
  const isNotified = entry.status === 'NOTIFIED'

  async function handleLeave() {
    setLeaving(true)
    const result = await leaveWaitlistAction(eventId)
    setLeaving(false)
    if (result?.error) toast.error(result.error)
    else toast.success('Você saiu da fila de espera.')
  }

  async function handleConfirm(method: 'PIX' | 'WALLET') {
    setConfirming(true)
    const result = await confirmWaitlistSpotAction(eventId, method)
    setConfirming(false)
    if (result?.error) toast.error(result.error)
  }

  if (isNotified) {
    return (
      <Card className="border-warning bg-warning/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Bell className="size-5 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Vaga disponível para você!</p>
              <p className="text-xs text-white/50">
                Uma vaga foi reservada em seu nome. Confirme antes de{' '}
                {entry.expires_at ? formatDateTime(entry.expires_at) : '–'}.
              </p>
            </div>
          </div>

          {eventPrice > 0 ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                disabled={confirming}
                onClick={() => handleConfirm('PIX')}
              >
                Pagar com PIX
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={confirming}
                onClick={() => handleConfirm('WALLET')}
              >
                Usar carteira
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="w-full"
              disabled={confirming}
              onClick={() => handleConfirm('PIX')}
            >
              Confirmar inscrição gratuita
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-white/50 text-xs"
            disabled={leaving}
            onClick={handleLeave}
          >
            Recusar vaga
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-dashed">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Clock className="size-5 text-white/50 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Você está na fila de espera</p>
            <p className="text-xs text-white/50">
              Posição <strong>#{entry.position}</strong> — você será notificado quando uma vaga abrir.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/50 bg-white/[0.04] rounded-lg p-2">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>Quando uma vaga abrir, você terá 3 horas para confirmar.</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={leaving}
          onClick={handleLeave}
        >
          Sair da fila
        </Button>
      </CardContent>
    </Card>
  )
}
