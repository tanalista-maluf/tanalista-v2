'use client'

import { useEffect, useRef } from 'react'

// Captcha do Cloudflare (Turnstile). O Supabase Auth confere o token no
// cadastro, no login com senha e na recuperação de senha (Authentication >
// Attack Protection), então ele barra também quem chama a API do Supabase
// direto, sem passar pelo formulário. Sem a chave pública, nada aparece e os
// formulários seguem sem token (desenvolvimento local). A chave vem de
// NEXT_PUBLIC_TURNSTILE_SITE_KEY; para testes locais há as chaves de teste do
// Cloudflare (1x00000000000000000000BB passa sempre, sem aparecer).
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('turnstile'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

type TurnstileProps = {
  // Recebe o token, ou null quando ele expira ou dá erro
  onToken: (token: string | null) => void
  // Mudar o valor gera um token novo (cada token vale para uma tentativa só)
  resetKey?: number
  // Avisa quando o Cloudflare pede um clique e a caixa aparece
  onVisible?: () => void
  className?: string
}

export function Turnstile({ onToken, resetKey = 0, onVisible, className }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  const onVisibleRef = useRef(onVisible)

  useEffect(() => {
    onTokenRef.current = onToken
    onVisibleRef.current = onVisible
  })

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return
    let cancelled = false

    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return
        widgetRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'dark',
          language: 'pt-br',
          'refresh-expired': 'auto',
          // Quase sempre fica invisível: a caixa só aparece quando o Cloudflare desconfia
          appearance: 'interaction-only',
          'before-interactive-callback': () => onVisibleRef.current?.(),
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        })
      })
      .catch(() => onTokenRef.current(null))

    return () => {
      cancelled = true
      if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current)
      widgetRef.current = null
    }
  }, [])

  useEffect(() => {
    if (resetKey === 0 || !widgetRef.current || !window.turnstile) return
    onTokenRef.current(null)
    window.turnstile.reset(widgetRef.current)
  }, [resetKey])

  if (!TURNSTILE_SITE_KEY) return null
  return <div ref={containerRef} className={className} />
}
