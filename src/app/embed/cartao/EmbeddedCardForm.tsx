'use client'

import { CardPaymentForm, type CardFormData } from '@/features/participacoes/components/CardPaymentForm'

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void }
  }
}

interface EmbeddedCardFormProps {
  publicKey: string | null
  stub: boolean
  amountCents: number
  email?: string
  maxInstallments?: number
}

export function EmbeddedCardForm(props: EmbeddedCardFormProps) {
  function handleSubmit(data: CardFormData) {
    window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'card', data }))
  }

  return <CardPaymentForm {...props} onSubmit={handleSubmit} />
}
