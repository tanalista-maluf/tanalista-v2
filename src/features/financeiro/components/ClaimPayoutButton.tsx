'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet, CheckCircle, Loader2 } from 'lucide-react'
import { claimEventPayoutAction } from '@/features/financeiro/actions'
import { formatBalance } from '@/utils/format'

interface ClaimPayoutButtonProps {
  eventId: string
  netCents: number
  alreadyClaimed: boolean
  startsAt: string
}

export function ClaimPayoutButton({ eventId, netCents, alreadyClaimed, startsAt }: ClaimPayoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(alreadyClaimed)
  const router = useRouter()

  const eventPast = new Date() > new Date(startsAt)

  async function handleClaim() {
    if (loading || done || netCents <= 0 || !eventPast) return
    setLoading(true)
    const result = await claimEventPayoutAction(eventId)
    setLoading(false)

    if (result.error) {
      alert(result.error)
      return
    }

    setDone(true)
    router.refresh()
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
        <CheckCircle className="size-4 shrink-0" />
        Receita resgatada para a carteira
      </div>
    )
  }

  if (!eventPast) {
    const dateStr = new Date(startsAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const timeStr = new Date(startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return (
      <div className="space-y-2">
        <button
          disabled
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/30 font-bold text-sm cursor-not-allowed"
        >
          <Wallet className="size-4" />
          Resgatar receita para a carteira
        </button>
        <p className="text-xs text-center text-white/30">
          Disponível após o evento · {dateStr} às {timeStr}
        </p>
      </div>
    )
  }

  const disabled = netCents <= 0 || loading

  return (
    <button
      onClick={handleClaim}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-primary text-black font-bold text-sm transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Wallet className="size-4" />
      )}
      {loading
        ? 'Resgatando...'
        : netCents <= 0
          ? 'Sem valor disponível'
          : `Resgatar ${formatBalance(netCents)} para a carteira`}
    </button>
  )
}
