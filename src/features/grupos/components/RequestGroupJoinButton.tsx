'use client'

import { useState } from 'react'
import { Lock, Clock, XCircle } from 'lucide-react'
import { requestGroupJoinAction } from '../actions'

interface Props {
  groupId: string
  existingStatus?: 'PENDING' | 'REJECTED' | null
}

export function RequestGroupJoinButton({ groupId, existingStatus }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    existingStatus === 'PENDING' ? 'done' : 'idle'
  )
  const [error, setError] = useState<string | null>(null)

  if (existingStatus === 'REJECTED') {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
        <XCircle className="size-4 shrink-0" />
        Solicitação recusada
      </div>
    )
  }

  if (status === 'done' || existingStatus === 'PENDING') {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm">
        <Clock className="size-4 shrink-0" />
        Solicitação enviada · Aguardando aprovação
      </div>
    )
  }

  async function handleRequest() {
    setStatus('loading')
    setError(null)
    const result = await requestGroupJoinAction(groupId)
    if (result?.error) {
      setError(result.error)
      setStatus('error')
    } else {
      setStatus('done')
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleRequest}
        disabled={status === 'loading'}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/15 border border-primary/30 text-primary font-semibold text-sm hover:bg-primary/20 transition-all disabled:opacity-60"
      >
        <Lock className="size-4" />
        {status === 'loading' ? 'Enviando...' : 'Solicitar entrada'}
      </button>
      {status === 'error' && error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
