'use client'

import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { purgeCancelledEventsAction } from '../actions'

// Apaga de vez os eventos cancelados que nunca tiveram inscrição; os que
// tiveram ficam, porque guardam pagamentos e estornos
export function PurgeCancelledButton() {
  const [busy, setBusy] = useState(false)

  async function purge() {
    if (!window.confirm('Apagar de vez os eventos cancelados que nunca tiveram inscrição? Os que tiveram ficam, porque guardam pagamentos e estornos.')) return
    setBusy(true)
    const result = await purgeCancelledEventsAction()
    setBusy(false)
    if ('error' in result) return toast.error(result.error)
    toast.success(
      `${result.removed} ${result.removed === 1 ? 'evento removido' : 'eventos removidos'}.` +
        (result.kept > 0 ? ` ${result.kept} ${result.kept === 1 ? 'ficou' : 'ficaram'} por ter inscrições.` : '')
    )
  }

  return (
    <button
      type="button"
      onClick={purge}
      disabled={busy}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-400/20 bg-red-400/5 text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-60">
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      Limpar cancelados
    </button>
  )
}
