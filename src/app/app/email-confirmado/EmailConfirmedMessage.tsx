'use client'

import { useSyncExternalStore } from 'react'
import { CheckCheck, CircleAlert } from 'lucide-react'

// Quando o link é inválido ou expirou, o Supabase redireciona com o erro na URL
function readLinkError() {
  const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search)
  return params.has('error') || params.has('error_code')
}

const subscribe = () => () => {}

export function EmailConfirmedMessage() {
  const linkError = useSyncExternalStore(subscribe, readLinkError, () => false)

  return (
    <div className="max-w-sm text-center space-y-4">
      <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
        {linkError ? <CircleAlert className="size-8 text-destructive" /> : <CheckCheck className="size-8 text-primary" />}
      </div>
      <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
        {linkError ? 'Link inválido ou expirado' : 'E-mail confirmado!'}
      </h1>
      <p className="text-sm text-white/50">
        {linkError
          ? 'Volte ao app TáNaLista e tente entrar. Se o e-mail ainda não estiver confirmado, cadastre-se de novo para receber outro link.'
          : 'Agora é só voltar ao app TáNaLista e entrar com seu e-mail e senha.'}
      </p>
      <a
        href="tanalista://"
        className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-background font-semibold text-sm">
        Abrir o app
      </a>
    </div>
  )
}
