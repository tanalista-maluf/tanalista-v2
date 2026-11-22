import { SplashScreen } from 'expo-router'
import { useCallback, useState } from 'react'
import { AnimatedSplash } from '@/components/animated-splash'
import { useSession } from './ctx'

SplashScreen.preventAutoHideAsync()

// Segura a splash até a sessão guardada ser lida e as fontes carregarem, para
// não piscar a tela errada nem o texto na fonte do sistema. Depois a abertura
// animada roda por cima do app e sai de cena.
export function SplashScreenController({ fontsReady }: { fontsReady: boolean }) {
  const { isLoading } = useSession()
  const [animating, setAnimating] = useState(true)
  const ready = !isLoading && fontsReady
  const finish = useCallback(() => setAnimating(false), [])

  if (ready) {
    SplashScreen.hide()
  }

  return animating ? <AnimatedSplash ready={ready} onDone={finish} /> : null
}
