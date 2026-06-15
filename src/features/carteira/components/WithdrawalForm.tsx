'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { CheckCheck } from 'lucide-react'

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

  async function onSubmit(data: FormData) {
    // Converter valor textual (ex: "50,00") para centavos
    const normalized = data.amount.replace(',', '.')
    const amount_cents = Math.round(parseFloat(normalized) * 100)

    if (isNaN(amount_cents)) {
      toast.error('Valor inválido.')
      return
    }
    if (amount_cents > balance) {
      toast.error('Valor superior ao saldo disponível.')
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
      <div className="rounded-lg bg-white/[0.04] p-4 text-sm">
        Saldo disponível: <strong>{formatPrice(balance)}</strong>
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
        {isSubmitting ? 'Processando...' : 'Solicitar saque'}
      </Button>
    </form>
  )
}
