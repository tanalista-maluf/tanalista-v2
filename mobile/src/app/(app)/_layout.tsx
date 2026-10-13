import { Stack } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { colors, fonts } from '@/lib/theme'

export default function AppLayout() {
  return (
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
      }}
    />
  )
}

const styles = StyleSheet.create({
  header: {
    flex: 1,
    backgroundColor: 'rgba(13,26,20,0.92)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
})
