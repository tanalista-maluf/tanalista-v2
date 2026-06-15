'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Controller } from 'react-hook-form'
import { requestWithdrawalAction } from '@/features/carteira/actions'
import { formatPrice } from '@/utils/format'
import { toast } from 'sonner'
import { CheckCheck, Info } from 'lucide-react'

// Taxa de saque: 1% do valor solicitado (cobrada pelo gateway de transferência PIX)
const WITHDRAWAL_FEE_PCT = 1

function calcFee(amountCents: number) {
  const fee = Math.round(amountCents * (WITHDRAWAL_FEE_PCT / 100))
  return { fee, net: amountCents - fee, total: amountCents }
}

const schema = z.object({
  amount: z.string().min(1, 'Informe o valor.'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF inválido — 11 dígitos sem pontuação.'),
  pix_key: z.string().min(1, 'Chave PIX é obrigatória.'),
  pix_key_type: z.enum(['cpf', 'email', 'phone', 'random']),
})

type FormData = z.infer<typeof schema>

interface WithdrawalFormProps {
  balance: number
}

export function WithdrawalForm({ balance }: WithdrawalFormProps) {
  const [success, setSuccess] = useState(false)
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { pix_key_type: 'cpf' },
  })

  const amountRaw = useWatch({ control, name: 'amount', defaultValue: '' })
  const amountCents = Math.round(parseFloat(amountRaw.replace(',', '.')) * 100) || 0
  const { fee, net } = calcFee(amountCents)
  const showBreakdown = amountCents >= 500

  async function onSubmit(data: FormData) {
    const normalized = data.amount.replace(',', '.')
    const amount_cents = Math.round(parseFloat(normalized) * 100)

    if (isNaN(amount_cents)) { toast.error('Valor inválido.'); return }
    if (amount_cents < 500) { toast.error('Valor mínimo: R$ 5,00.'); return }

    const { total } = calcFee(amount_cents)
    if (total > balance) {
      toast.error('Saldo insuficiente para cobrir o valor e a taxa.')
      return
    }

    const result = await requestWithdrawalAction({
      amount_cents,
      cpf: data.cpf,
      pix_key: data.pix_key,
      pix_key_type: data.pix_key_type,
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-3 py-8">
        <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CheckCheck className="size-8 text-primary" />
        </div>
        <p className="font-semibold">Solicitação enviada!</p>
        <p className="text-sm text-white/50">
          Seu saque será processado em até 2 dias úteis via PIX.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="rounded-xl bg-white/[0.04] border border-white/8 p-4 text-sm">
        Saldo disponível: <strong className="text-primary">{formatPrice(balance)}</strong>
      </div>

      {/* Aviso de taxa */}
      <div className="flex items-start gap-2.5 rounded-xl bg-yellow-400/5 border border-yellow-400/15 p-3.5">
        <Info className="size-4 text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-sm text-white/60">
          Saques estão sujeitos a uma taxa de <strong className="text-white">{WITHDRAWAL_FEE_PCT}%</strong>. O valor líquido será transferido para a sua chave PIX.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Valor a sacar (R$)</Label>
        <Input
          {...register('amount')}
          placeholder="Ex: 50,00"
          type="text"
          inputMode="decimal"
        />
        {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
      </div>

      {/* Breakdown em tempo real */}
      {showBreakdown && (
        <div className="rounded-xl bg-white/[0.03] border border-white/8 divide-y divide-white/6 text-sm">
          <div className="flex justify-between px-4 py-2.5 text-white/50">
            <span>Valor solicitado</span>
            <span>{formatPrice(amountCents)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 text-yellow-400/80">
            <span>Taxa de saque ({WITHDRAWAL_FEE_PCT}%)</span>
            <span>− {formatPrice(fee)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 font-bold text-primary">
            <span>Você receberá</span>
            <span>{formatPrice(net)}</span>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>CPF (titular da conta)</Label>
        <Input
          {...register('cpf')}
          placeholder="Somente números"
          maxLength={11}
          inputMode="numeric"
        />
        {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Tipo de chave PIX</Label>
        <Controller
          control={control}
          name="pix_key_type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="phone">Telefone</SelectItem>
                <SelectItem value="random">Chave aleatória</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Chave PIX</Label>
        <Input {...register('pix_key')} placeholder="Sua chave PIX" />
        {errors.pix_key && <p className="text-xs text-destructive">{errors.pix_key.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Processando...' : `Solicitar saque de ${showBreakdown ? formatPrice(net) : '—'}`}
      </Button>
    </form>
  )
}
