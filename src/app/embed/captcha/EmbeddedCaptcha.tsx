'use client'

import { useEffect } from 'react'
import { Turnstile, TURNSTILE_SITE_KEY } from '@/features/auth/components/Turnstile'

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void }
  }
}

function send(message: { token: string | null } | { disabled: true } | { visible: true }) {
  window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'captcha', ...message }))
}

export function EmbeddedCaptcha() {
  // Sem chave configurada (desenvolvimento local), o app segue sem token
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) send({ disabled: true })
  }, [])

  return <Turnstile onToken={(token) => send({ token })} onVisible={() => send({ visible: true })} />
}
