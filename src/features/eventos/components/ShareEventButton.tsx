'use client'

import { Share2, Check } from 'lucide-react'
import { useState } from 'react'

interface Props {
  eventId: string
}

export function ShareEventButton({ eventId }: Props) {
  const [copied, setCopied] = useState(false)

  const url = `${window.location.origin}/e/${eventId}`

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title: document.title, url }).catch(() => null)
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-white/60 hover:text-primary hover:border-primary/30 hover:bg-primary/8 transition-colors"
    >
      {copied ? <Check className="size-3.5 text-primary" /> : <Share2 className="size-3.5" />}
      {copied ? 'Link copiado!' : 'Compartilhar'}
    </button>
  )
}
