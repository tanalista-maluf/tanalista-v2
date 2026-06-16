'use client'

import { useState } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import { confirmWithdrawalAction, cancelWithdrawalAction } from '@/features/saques/actions'

export function WithdrawalActions({ id }: { id: string }) {
  const [loading, setLoading] = useState<'confirm' | 'cancel' | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handle(type: 'confirm' | 'cancel') {
    if (type === 'cancel') {
      const note = window.prompt('Motivo do cancelamento (opcional):')
      if (note === null) return // usuário clicou em Cancelar no prompt
      setLoading('cancel')
      const res = await cancelWithdrawalAction(id, note || undefined)
      setLoading(null)
      if (res.error) { setError(res.error); return }
    } else {
      setLoading('confirm')
      const res = await confirmWithdrawalAction(id)
      setLoading(null)
      if (res.error) { setError(res.error); return }
    }
    setDone(true)
  }

  if (done) return <span className="text-xs text-white/30 italic">Processado</span>

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-400">{error}</span>}
      <button
        onClick={() => handle('confirm')}
        disabled={!!loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-40"
      >
        {loading === 'confirm' ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
        Pago
      </button>
      <button
        onClick={() => handle('cancel')}
        disabled={!!loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 text-xs font-semibold hover:bg-red-400/20 transition-colors disabled:opacity-40"
      >
        {loading === 'cancel' ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
        Cancelar
      </button>
    </div>
  )
}
