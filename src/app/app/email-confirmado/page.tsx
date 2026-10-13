import type { Metadata } from 'next'
import { EmailConfirmedMessage } from './EmailConfirmedMessage'

export const metadata: Metadata = { title: 'E-mail confirmado', robots: { index: false } }

// Destino do link de confirmação de e-mail de quem se cadastrou pelo app
// mobile: a sessão continua no app, então aqui só se avisa para voltar a ele.
export default function EmailConfirmedPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <EmailConfirmedMessage />
    </main>
  )
}
