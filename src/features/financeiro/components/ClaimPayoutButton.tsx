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
}

export function ClaimPayoutButton({ eventId, netCents, alreadyClaimed }: ClaimPayoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(alreadyClaimed)
  const router = useRouter()

  async function handleClaim() {
    if (loading || done || netCents <= 0) return
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
