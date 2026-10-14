'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

// Formulário de cartão do Mercado Pago (Card Payment Brick). Os campos do
// cartão ficam em iframes do próprio Mercado Pago; daqui só sai um token de
// uso único, que o servidor usa para cobrar (card-payment.ts).

export type CardFormData = {
  token: string
  payment_method_id: string
  issuer_id?: string | number
  identification?: { type?: string; number?: string }
}

interface CardPaymentFormProps {
  publicKey: string | null
  // Sem chave e fora de produção: botões que simulam cartão aprovado e recusado
  stub: boolean
  amountCents: number
  email?: string
  onSubmit: (data: CardFormData) => Promise<void> | void
}

type BrickFormData = {
  token: string
  payment_method_id: string
  issuer_id?: string | number
  payer?: { identification?: { type?: string; number?: string } }
}

type BrickController = { unmount: () => void }

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => {
      bricks: () => {
        create: (brick: string, containerId: string, settings: unknown) => Promise<BrickController>
      }
    }
  }
}

const SDK_URL = 'https://sdk.mercadopago.com/js/v2'
const CONTAINER_ID = 'card-payment-brick'

// Paleta do TáNaLista (globals.css) aplicada ao tema escuro do Brick, que
// não enxerga as variáveis CSS da página
const BRICK_COLORS = {
  formBackgroundColor: '#0D1A14',
  inputBackgroundColor: '#162A20',
  textPrimaryColor: '#F0FFF4',
  textSecondaryColor: '#9DB5A6',
  baseColor: '#4ADE80',
  baseColorFirstVariant: '#22C55E',
  baseColorSecondVariant: '#16A34A',
  buttonTextColor: '#0D1A14',
  outlinePrimaryColor: '#2A4638',
  outlineSecondaryColor: '#1A3028',
  errorColor: '#F87171',
  successColor: '#4ADE80',
  borderRadiusMedium: '12px',
  borderRadiusLarge: '14px',
  formPadding: '0px',
}

function loadSdk(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_URL
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('sdk'))
    document.head.appendChild(script)
  })
}

export function CardPaymentForm({ publicKey, stub, amountCents, email, onSubmit }: CardPaymentFormProps) {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  // O Brick guarda o callback do momento em que foi criado
  const submitRef = useRef(onSubmit)
  useEffect(() => {
    submitRef.current = onSubmit
  }, [onSubmit])

  useEffect(() => {
    if (!publicKey) return
    let cancelled = false
    let controller: BrickController | null = null

    loadSdk()
      .then(() => {
        if (cancelled || !window.MercadoPago) return
        const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' })
        return mp.bricks().create('cardPayment', CONTAINER_ID, {
          initialization: { amount: amountCents / 100, ...(email && { payer: { email } }) },
          customization: {
            paymentMethods: { minInstallments: 1, maxInstallments: 1, types: { included: ['credit_card'] } },
            visual: { style: { theme: 'dark', customVariables: BRICK_COLORS }, hideFormTitle: true },
          },
          callbacks: {
            onReady: () => setReady(true),
            onError: (error: unknown) => console.error('[CARTAO] brick', error),
            onSubmit: async (data: BrickFormData) => {
              await submitRef.current({
                token: data.token,
                payment_method_id: data.payment_method_id,
                issuer_id: data.issuer_id,
                identification: data.payer?.identification,
              })
            },
          },
        })
      })
      .then((created) => {
        if (!created) return
        if (cancelled) created.unmount()
        else controller = created
      })
      .catch(() => setFailed(true))

    return () => {
      cancelled = true
      controller?.unmount()
    }
  }, [publicKey, amountCents, email])

  if (!publicKey) {
    if (!stub) {
      return <p className="text-sm text-center text-white/50">Pagamento com cartão indisponível no momento.</p>
    }
    return (
      <div className="space-y-3">
        <p className="text-xs text-center text-white/50">Ambiente de teste: nenhuma cobrança é feita.</p>
        <button
          type="button"
          onClick={() => onSubmit({ token: 'stub-approved', payment_method_id: 'visa' })}
          className="w-full py-3 rounded-xl bg-primary text-background font-semibold text-sm">
          Pagar com cartão de teste
        </button>
        <button
          type="button"
          onClick={() => onSubmit({ token: 'stub-rejected', payment_method_id: 'visa' })}
          className="w-full py-3 rounded-xl border border-white/10 text-white/70 font-semibold text-sm">
          Simular cartão recusado
        </button>
      </div>
    )
  }

  if (failed) {
    return (
      <p className="text-sm text-center text-destructive">
        Não foi possível carregar o formulário de cartão. Verifique sua conexão e tente de novo.
      </p>
    )
  }

  return (
    <div>
      {!ready && (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      )}
      <div id={CONTAINER_ID} />
    </div>
  )
}
