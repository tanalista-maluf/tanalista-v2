'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { redeemCouponAction } from '../actions'
import { formatPrice } from '@/utils/format'
import { toast } from 'sonner'
import { Tag, ChevronDown } from 'lucide-react'

export function RedeemCouponForm() {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    const result = await redeemCouponAction(code)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Cupom aplicado! ${formatPrice(result.amount_cents!)} creditados na sua carteira.`)
      setCode('')
      setOpen(false)
    }
  }

  return (
    <div className="card-dark rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-sm text-white/50 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          <Tag className="size-4 text-primary/60" />
          Tenho um cupom
        </span>
        <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 flex gap-2">
          <Input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="CÓDIGO DO CUPOM"
            className="uppercase tracking-widest"
            autoFocus
          />
          <Button type="submit" disabled={loading || !code.trim()} className="shrink-0">
            {loading ? '...' : 'Resgatar'}
          </Button>
        </form>
      )}
    </div>
  )
}
