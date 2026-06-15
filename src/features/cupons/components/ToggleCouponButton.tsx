'use client'

import { useState } from 'react'
import { toggleCouponAction } from '../actions'
import { toast } from 'sonner'

export function ToggleCouponButton({ id, active }: { id: string; active: boolean }) {
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    await toggleCouponAction(id, !active)
    toast.success(active ? 'Cupom desativado' : 'Cupom ativado')
    setLoading(false)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
        active
          ? 'bg-primary/10 text-primary hover:bg-red-400/10 hover:text-red-400'
          : 'bg-white/5 text-white/30 hover:bg-primary/10 hover:text-primary'
      }`}
    >
      {loading ? '...' : active ? 'Ativo' : 'Inativo'}
    </button>
  )
}
