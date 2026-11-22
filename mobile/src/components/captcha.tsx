import { useState } from 'react'
import { StyleSheet } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import { apiUrl } from '@/lib/api'

// Captcha do Cloudflare (Turnstile) nas telas de entrar, criar conta e
// recuperar senha. O Supabase Auth confere o token quando a proteção por
// captcha está ligada (Authentication > Attack Protection), o que barra os
// bots que chamam a API de cadastro direto. Não há versão nativa: a página
// /embed/captcha do site gera o token e o devolve por postMessage.
export const CAPTCHA_ENABLED = process.env.EXPO_PUBLIC_CAPTCHA === '1'

type CaptchaProps = {
  // O token, null enquanto não há um válido, ou '' quando o site não tem
  // captcha configurado (ambiente local) e o envio segue sem token
  onToken: (token: string | null) => void
  // Mudar o valor recarrega o captcha: cada token vale para uma tentativa só
  resetKey?: number
}

export function Captcha({ onToken, resetKey = 0 }: CaptchaProps) {
  // Quase sempre o captcha passa sem ninguém ver; a caixa só ganha espaço na
  // tela quando o Cloudflare pede um clique
  const [visible, setVisible] = useState(false)

  if (!CAPTCHA_ENABLED) return null

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data)
      if (message?.type !== 'captcha') return
      if (message.visible) setVisible(true)
      else if (message.disabled) onToken('')
      else onToken(typeof message.token === 'string' ? message.token : null)
    } catch {
      // mensagem que não é do captcha
    }
  }

  return (
    <WebView
      key={resetKey}
      testID="captcha"
      source={{ uri: `${apiUrl}/embed/captcha` }}
      onMessage={handleMessage}
      onLoadStart={() => onToken(null)}
      onError={() => onToken(null)}
      scrollEnabled={false}
      setSupportMultipleWindows={false}
      style={styles.webview}
      containerStyle={visible ? styles.visible : styles.hidden}
    />
  )
}

const styles = StyleSheet.create({
  visible: { height: 70, flexGrow: 0 },
  // Carregada, mas fora do fluxo: não ocupa espaço nem soma o gap do formulário
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  webview: { backgroundColor: 'transparent' },
})
