import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter'
import { Manrope_300Light, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SessionProvider, useSession } from '@/ctx'
import { colors } from '@/lib/theme'
import { SplashScreenController } from '@/splash'

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
      <SplashScreenController fontsReady={fontsReady} />
      {fontsReady ? <RootNavigator /> : null}
    </SessionProvider>
  )
}

function RootNavigator() {
  const { session, isLoading } = useSession()
  if (isLoading) return null

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  )
}
