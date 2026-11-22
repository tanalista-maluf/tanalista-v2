import type { Metadata } from 'next'
import { EmbeddedCaptcha } from './EmbeddedCaptcha'

export const metadata: Metadata = { title: 'Verificação', robots: { index: false } }

// Captcha aberto dentro do app mobile (WebView), nas telas de entrar, criar
// conta e recuperar senha. O Turnstile não tem versão nativa: esta página gera
// o token e o devolve ao app, que o manda ao Supabase Auth.
export default function EmbeddedCaptchaPage() {
  return (
    <main className="flex-1 flex items-center justify-center">
      {/* O fundo fica por conta da tela do app */}
      <style>{'html, body { background: transparent !important; }'}</style>
      <EmbeddedCaptcha />
    </main>
  )
}
