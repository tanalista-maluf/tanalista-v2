'use client'

import { useState, useTransition } from 'react'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { deleteGroupAction } from '../actions'

export function DeleteGroupButton({ groupId, groupName }: { groupId: string; groupName: string }) {
  const [open, setOpen] = useState(false)
  const [confirmed, setConfirmed] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteGroupAction(groupId)
      if (result?.error) setError(result.error)
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-red-400/70 hover:text-red-400 transition-colors"
      >
        <Trash2 className="size-4" />
        Excluir grupo
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="size-5 text-red-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">Excluir grupo permanentemente</p>
          <p className="text-xs text-white/50 leading-relaxed">
            Esta ação é <span className="text-red-400 font-medium">irreversível</span>. Todos os eventos, membros,
            anúncios e histórico do grupo serão perdidos para sempre.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-white/40">
          Para confirmar, digite o nome do grupo: <span className="text-white/70 font-medium">{groupName}</span>
        </p>
        <input
          type="text"
          value={confirmed}
          onChange={e => { setConfirmed(e.target.value); setError(null) }}
          placeholder={groupName}
          className="w-full rounded-xl bg-white/[0.05] border border-white/[0.10] px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-red-500/40 transition-colors"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => { setOpen(false); setConfirmed(''); setError(null) }}
          disabled={isPending}
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] text-white/60 hover:text-white text-sm font-medium py-2 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleDelete}
          disabled={confirmed !== groupName || isPending}
          className="flex-1 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 text-sm font-semibold py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          Excluir
        </button>
      </div>
    </div>
  )
}
