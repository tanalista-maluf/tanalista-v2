import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter'
import { Manrope_300Light, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SessionProvider, useSession } from '@/ctx'
import { colors } from '@/lib/theme'
import { SplashScreenController } from '@/splash'
import { LogBox } from 'react-native'

// O build de simulador sem assinatura não tem acesso ao Keychain, e o
// expo-notifications reclama disso a cada abertura (inofensivo, só em
// desenvolvimento). A tela vermelha atrapalhava os testes automatizados.
LogBox.ignoreLogs(['[expo-notifications] Error reading persisted server registration info'])

export default function Root() {
  const [fontsLoaded, fontsError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Manrope_300Light,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  })
  // Se uma fonte falhar, segue com a do sistema em vez de travar na splash
  const fontsReady = fontsLoaded || !!fontsError

  return (
    <SessionProvider>
      <StatusBar style="light" />
      {fontsReady ? <RootNavigator /> : null}
      {/* Depois do app, para a abertura animada ficar por cima */}
      <SplashScreenController fontsReady={fontsReady} />
    </SessionProvider>
  )
}

function RootNavigator() {
  const { session, profile, isLoading, recovering } = useSession()
  if (isLoading) return null

  // Conta nova (por e-mail ou Google) completa o perfil antes de usar o app
  const needsOnboarding = !!session && !!profile && !profile.onboarding_completed && !recovering

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      {/* Quem voltou pelo link de recuperação define a senha nova antes de qualquer outra tela */}
      <Stack.Protected guard={!!session && recovering}>
        <Stack.Screen name="new-password" />
      </Stack.Protected>

      <Stack.Protected guard={!!session && !needsOnboarding && !recovering}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={needsOnboarding}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="forgot-password" />
      </Stack.Protected>

      <Stack.Screen name="auth/callback" />
    </Stack>
  )
}
