import { Stack } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppTabBar } from '@/components/app-tab-bar'
import { colors, fonts } from '@/lib/theme'

export default function AppLayout() {
  const insets = useSafeAreaInsets()
  return (
    <View style={styles.root}>
      {/* A barra inferior fica abaixo das telas e cuida da margem de baixo do
          aparelho: para as telas, essa margem passa a ser zero */}
      <SafeAreaInsetsContext.Provider value={{ ...insets, bottom: 0 }}>
        <Stack
          screenOptions={{
            // Como o cabeçalho fixo do site: escuro, levemente translúcido, com uma
            // linha fina embaixo; o conteúdo passa por baixo ao rolar
            headerTransparent: true,
            headerBackground: () => <View style={styles.header} />,
            headerTintColor: colors.foreground,
            headerTitleStyle: { fontFamily: fonts.heading },
            headerShadowVisible: false,
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: colors.background },
          }}>
          {/* As abas têm o próprio cabeçalho */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: '' }} />
        </Stack>
      </SafeAreaInsetsContext.Provider>
      <AppTabBar />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flex: 1,
    backgroundColor: 'rgba(13,26,20,0.92)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
})
