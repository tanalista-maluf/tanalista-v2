'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createCouponAction } from '../actions'
import { toast } from 'sonner'

export function CouponForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const maxUses = fd.get('max_uses') as string
    const expiresAt = fd.get('expires_at') as string

    const result = await createCouponAction({
      code: (fd.get('code') as string).toUpperCase(),
      amount_cents: Math.round(parseFloat(fd.get('amount') as string) * 100),
      max_uses: maxUses ? parseInt(maxUses) : null,
      expires_at: expiresAt || null,
    })

    setLoading(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Cupom criado!')
      setOpen(false)
      ;(e.target as HTMLFormElement).reset()
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        + Novo cupom
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card-dark rounded-2xl p-5 space-y-4">
      <h2 className="font-bold text-white">Novo cupom</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Código</Label>
          <Input name="code" placeholder="EX: BEMVINDO10" required maxLength={30}
            onChange={e => (e.target.value = e.target.value.toUpperCase())} />
        </div>
        <div className="space-y-1.5">
          <Label>Valor (R$)</Label>
          <Input name="amount" type="number" step="0.01" min="1" placeholder="10,00" required />
        </div>
        <div className="space-y-1.5">
          <Label>Limite de usos (vazio = ilimitado)</Label>
          <Input name="max_uses" type="number" min="1" placeholder="100" />
        </div>
        <div className="space-y-1.5">
          <Label>Validade (vazio = sem expiração)</Label>
          <Input name="expires_at" type="date" />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Criando...' : 'Criar cupom'}</Button>
      </div>
    </form>
  )
}
