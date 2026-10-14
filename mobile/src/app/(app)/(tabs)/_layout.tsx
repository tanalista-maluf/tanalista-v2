import { Tabs } from 'expo-router/js-tabs'
import { StyleSheet, View } from 'react-native'
import { setActiveTab } from '@/components/app-tab-bar'
import { Logo } from '@/components/logo'
import { NotificationBell } from '@/components/notification-bell'
import { colors, fonts } from '@/lib/theme'

// Abas da área logada. A barra inferior não é a das abas: é a AppTabBar de
// (app)/_layout.tsx, que fica visível também nas telas abertas a partir daqui.
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenListeners={({ route }) => ({ focus: () => setActiveTab(route.name) })}
      screenOptions={{
        // Mesmo cabeçalho do Stack: escuro, translúcido, o conteúdo passa por baixo
        headerTransparent: true,
        headerBackground: () => <View style={styles.header} />,
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontFamily: fonts.heading },
        headerShadowVisible: false,
        headerTitleAlign: 'center',
        headerRight: () => <NotificationBell />,
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          headerLeft: () => (
            <View style={styles.logo}>
              <Logo size={19} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="events" options={{ title: 'Eventos' }} />
      <Tabs.Screen name="groups" options={{ title: 'Grupos' }} />
      <Tabs.Screen name="wallet" options={{ title: 'Carteira' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  header: {
    flex: 1,
    backgroundColor: 'rgba(13,26,20,0.92)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  logo: { marginLeft: 16 },
})
