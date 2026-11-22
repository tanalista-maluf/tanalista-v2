import type { Metadata } from 'next'
import { getCardFormConfig } from '@/features/participacoes/card-config'
import { EmbeddedCardForm } from './EmbeddedCardForm'

export const metadata: Metadata = { title: 'Pagamento com cartão', robots: { index: false } }

// Formulário de cartão aberto dentro do app mobile (WebView). A página não tem
// sessão nem cobra nada: só devolve ao app o token do cartão, e o app chama a
// API autenticada. O valor na URL serve apenas ao formulário; quem define o
// valor cobrado é o servidor.
export default async function EmbeddedCardPage({
  searchParams,
}: {
  searchParams: Promise<{ amount?: string; email?: string; installments?: string }>
}) {
  const sp = await searchParams
  const amountCents = Number.parseInt(sp.amount ?? '', 10)
  // Recarga da carteira pode ser parcelada (até 12x); inscrição, só à vista
  const maxInstallments = Math.min(12, Math.max(1, Number.parseInt(sp.installments ?? '1', 10) || 1))
  const { publicKey, stub } = getCardFormConfig()

  return (
    <main className="flex-1 w-full max-w-sm mx-auto px-4 py-4">
      {Number.isFinite(amountCents) && amountCents > 0 ? (
        <EmbeddedCardForm
          publicKey={publicKey}
          stub={stub}
          amountCents={amountCents}
          email={sp.email}
          maxInstallments={maxInstallments}
        />
      ) : (
        <p className="text-sm text-center text-white/50">Valor inválido.</p>
      )}
    </main>
  )
}
