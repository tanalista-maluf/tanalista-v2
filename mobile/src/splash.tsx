import { SplashScreen } from 'expo-router'
import { useSession } from './ctx'

SplashScreen.preventAutoHideAsync()

// Segura a splash até a sessão guardada ser lida, para não piscar a tela errada
export function SplashScreenController() {
  const { isLoading } = useSession()

  if (!isLoading) {
    SplashScreen.hide()
  }

  return null
}
