'use client'

import { useState } from 'react'
import { Link2, Check, RefreshCw } from 'lucide-react'

interface Props {
  inviteToken: string
  eventId: string
}

export function EventInviteButton({ inviteToken: initialToken, eventId }: Props) {
  const [token, setToken] = useState(initialToken)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://tanalista.app'}/eventos/${eventId}?invite=${token}`

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRegenerate() {
    if (!confirm('Gerar novo link invalidará o link atual. Confirmar?')) return
    setRegenerating(true)
    const { regenerateEventInviteAction } = await import('../actions')
    const res = await regenerateEventInviteAction(eventId)
    if (res.token) setToken(res.token)
    setRegenerating(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <Link2 className="size-4 text-white/40 shrink-0" />
        <span className="text-xs text-white/50 flex-1 truncate">{inviteUrl}</span>
        <button
          onClick={handleCopy}
          className="shrink-0 text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          {copied ? <><Check className="size-3" /> Copiado</> : 'Copiar'}
        </button>
      </div>
      <button
        onClick={handleRegenerate}
        disabled={regenerating}
        className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        <RefreshCw className={['size-3', regenerating ? 'animate-spin' : ''].join(' ')} />
        Gerar novo link
      </button>
    </div>
  )
}
