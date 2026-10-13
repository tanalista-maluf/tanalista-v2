import { SplashScreen } from 'expo-router'
import { useSession } from './ctx'

SplashScreen.preventAutoHideAsync()

// Segura a splash até a sessão guardada ser lida e as fontes carregarem, para
// não piscar a tela errada nem o texto na fonte do sistema
export function SplashScreenController({ fontsReady }: { fontsReady: boolean }) {
  const { isLoading } = useSession()

  if (!isLoading && fontsReady) {
    SplashScreen.hide()
  }

  return null
}
