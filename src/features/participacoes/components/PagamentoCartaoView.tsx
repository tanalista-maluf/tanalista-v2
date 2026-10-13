'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCheck, Clock, Loader2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CardPaymentForm, type CardFormData } from './CardPaymentForm'

interface PagamentoCartaoViewProps {
  participationId: string
  eventId: string
  amountCents: number
  email?: string
  publicKey: string | null
  stub: boolean
}

type State = { kind: 'form' } | { kind: 'paying' } | { kind: 'approved' } | { kind: 'in_process' } | { kind: 'error'; message: string }

export function PagamentoCartaoView({ participationId, eventId, amountCents, email, publicKey, stub }: PagamentoCartaoViewProps) {
  const router = useRouter()
  const [state, setState] = useState<State>({ kind: 'form' })

  async function pay(card: CardFormData) {
    setState({ kind: 'paying' })
    try {
      const response = await fetch('/api/pagamentos/cartao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participation_id: participationId, ...card }),
      })
      const data = await response.json()
      if (data.error) {
        setState({ kind: 'error', message: data.error })
      } else if (data.status === 'approved') {
        setState({ kind: 'approved' })
        setTimeout(() => router.push(`/eventos/${eventId}?joined=1`), 1500)
      } else {
        setState({ kind: 'in_process' })
      }
    } catch {
      setState({ kind: 'error', message: 'Erro ao processar o cartão. Tente novamente.' })
    }
  }

  if (state.kind === 'approved') {
    return (
      <div className="text-center space-y-3 py-8">
        <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CheckCheck className="size-8 text-primary" />
        </div>
        <p className="font-semibold text-primary">Pagamento confirmado!</p>
        <p className="text-sm text-white/50">Redirecionando...</p>
      </div>
    )
  }

  if (state.kind === 'in_process' || state.kind === 'error') {
    return (
      <div className="text-center space-y-4 py-8">
        {state.kind === 'in_process' && <Clock className="size-12 mx-auto text-primary" />}
        <p className={cn('text-sm', state.kind === 'error' ? 'text-destructive' : 'text-white/70')}>
          {state.kind === 'error'
            ? state.message
            : 'Seu pagamento está em análise. A inscrição é confirmada assim que o Mercado Pago aprovar.'}
        </p>
        {state.kind === 'error' ? (
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => setState({ kind: 'form' })} className={cn(buttonVariants())}>
              Tentar outro cartão
            </button>
            <Link href={`/eventos/${eventId}/inscricao`} className={cn(buttonVariants({ variant: 'outline' }))}>
              Escolher outra forma de pagamento
            </Link>
          </div>
        ) : (
          <Link href={`/eventos/${eventId}`} className={cn(buttonVariants({ variant: 'outline' }))}>
            Voltar ao evento
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <CardPaymentForm publicKey={publicKey} stub={stub} amountCents={amountCents} email={email} onSubmit={pay} />
      {state.kind === 'paying' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  )
}
