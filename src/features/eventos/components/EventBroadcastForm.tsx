'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { sendEventBroadcastAction } from '../actions'
import { toast } from 'sonner'
import { Megaphone } from 'lucide-react'

export function EventBroadcastForm({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    if (!message.trim()) return
    setLoading(true)
    const result = await sendEventBroadcastAction(eventId, message)
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Aviso enviado para ${result.sent} participante${result.sent !== 1 ? 's' : ''}.`)
      setMessage('')
      setOpen(false)
    }
  }

  return (
    <div className="card-dark rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Megaphone className="size-4 text-primary" />
        <p className="text-sm font-semibold text-white">Avisar participantes</p>
      </div>
      {open ? (
        <div className="space-y-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ex: Portão abre às 7h30, primeira rodada às 8h30."
            rows={3}
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/30">{message.length}/500</span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => { setOpen(false); setMessage('') }}>
                Cancelar
              </Button>
              <Button type="button" size="sm" disabled={loading || !message.trim()} onClick={handleSend}>
                {loading ? 'Enviando...' : 'Enviar aviso'}
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-white/25">Envia notificação push e e-mail para todos os participantes confirmados.</p>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="w-full">
          Enviar aviso aos confirmados
        </Button>
      )}
    </div>
  )
}
