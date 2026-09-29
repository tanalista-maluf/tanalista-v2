'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createEventCouponAction, toggleEventCouponAction } from '../actions'
import { toast } from 'sonner'
import { Ticket } from 'lucide-react'

interface Coupon {
  id: string
  code: string
  max_uses: number | null
  uses_count: number
  active: boolean
}

interface Props {
  eventId: string
  coupons: Coupon[]
}

export function EventCoupons({ eventId, coupons: initialCoupons }: Props) {
  const [coupons, setCoupons] = useState(initialCoupons)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const code = (fd.get('code') as string).toUpperCase()
    const maxUses = parseInt(fd.get('max_uses') as string, 10)

    const result = await createEventCouponAction(eventId, { code, max_uses: maxUses })
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Cupom criado! Dá acesso gratuito ao evento.')
      setCoupons(prev => [{ id: crypto.randomUUID(), code, max_uses: maxUses, uses_count: 0, active: true }, ...prev])
      setOpen(false)
      ;(e.target as HTMLFormElement).reset()
    }
  }

  async function handleToggle(id: string, active: boolean) {
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, active: !active } : c))
    const result = await toggleEventCouponAction(eventId, id, !active)
    if (result.error) {
      toast.error(result.error)
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, active } : c))
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40">
        Cupons de evento dão acesso gratuito, com limite de usos. Úteis para liberar a taxa de outros administradores.
      </p>

      {coupons.length > 0 && (
        <div className="space-y-2">
          {coupons.map(c => (
            <div key={c.id} className="flex items-center gap-3 card-dark rounded-xl p-3">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Ticket className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{c.code}</p>
                <p className="text-xs text-white/40">{c.uses_count}/{c.max_uses ?? '∞'} usos</p>
              </div>
              <button
                onClick={() => handleToggle(c.id, c.active)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                  c.active
                    ? 'bg-primary/10 text-primary hover:bg-red-400/10 hover:text-red-400'
                    : 'bg-white/5 text-white/30 hover:bg-primary/10 hover:text-primary'
                }`}
              >
                {c.active ? 'Ativo' : 'Inativo'}
              </button>
            </div>
          ))}
        </div>
      )}

      {open ? (
        <form onSubmit={handleSubmit} className="card-dark rounded-2xl p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Código</Label>
              <Input name="code" placeholder="EX: STAFF5" required minLength={3} maxLength={30}
                onChange={e => (e.target.value = e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-1.5">
              <Label>Limite de usos</Label>
              <Input name="max_uses" type="number" min="1" max="999" placeholder="5" required />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Criando...' : 'Criar cupom'}</Button>
          </div>
        </form>
      ) : (
        <Button onClick={() => setOpen(true)} variant="ghost" className="w-full">
          + Novo cupom do evento
        </Button>
      )}
    </div>
  )
}
