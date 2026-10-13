import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SessionProvider, useSession } from '@/ctx'
import { colors } from '@/lib/theme'
import { SplashScreenController } from '@/splash'

export default function Root() {
  return (
    <SessionProvider>
      <StatusBar style="light" />
      <SplashScreenController />
      <RootNavigator />
    </SessionProvider>
  )
}

function RootNavigator() {
  const { session } = useSession()

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
