import { Tabs } from 'expo-router/js-tabs'
import { CalendarDays, CircleUserRound, UsersRound } from 'lucide-react-native'
import { StyleSheet, View } from 'react-native'
import { Logo } from '@/components/logo'
import { colors, fonts } from '@/lib/theme'

// Barra inferior da área logada, como a do site no celular. As telas abertas a
// partir daqui (evento, checkout, grupo) ficam no Stack de (app)/_layout.tsx e
// cobrem a barra.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        // Mesmo cabeçalho do Stack: escuro, translúcido, o conteúdo passa por baixo
        headerTransparent: true,
        headerBackground: () => <View style={styles.header} />,
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontFamily: fonts.heading },
        headerShadowVisible: false,
        headerTitleAlign: 'center',
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: styles.bar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text50,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarLabel: 'Eventos',
          tabBarAccessibilityLabel: 'Eventos',
          tabBarButtonTestID: 'tab-events',
          headerLeft: () => (
            <View style={styles.logo}>
              <Logo size={19} />
            </View>
          ),
          tabBarIcon: ({ color, size }) => <CalendarDays size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Grupos',
          tabBarButtonTestID: 'tab-groups',
          tabBarIcon: ({ color, size }) => <UsersRound size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          // 'profile' é o nome que os testes de ponta a ponta já usam
          tabBarButtonTestID: 'profile',
          tabBarIcon: ({ color, size }) => <CircleUserRound size={size} color={color} />,
        }}
      />
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
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
})
