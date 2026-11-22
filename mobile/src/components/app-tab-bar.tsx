import { router, usePathname } from 'expo-router'
import { CalendarDays, CircleUserRound, House, UsersRound, Wallet, type LucideIcon } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fonts } from '@/lib/theme'

type TabName = 'index' | 'events' | 'groups' | 'wallet' | 'profile'

const TABS: { name: TabName; href: string; label: string; icon: LucideIcon; testID: string }[] = [
  { name: 'index', href: '/', label: 'Início', icon: House, testID: 'tab-home' },
  { name: 'events', href: '/events', label: 'Eventos', icon: CalendarDays, testID: 'tab-events' },
  { name: 'groups', href: '/groups', label: 'Grupos', icon: UsersRound, testID: 'tab-groups' },
  { name: 'wallet', href: '/wallet', label: 'Carteira', icon: Wallet, testID: 'tab-wallet' },
  // 'profile' é o nome que os testes de ponta a ponta já usam
  { name: 'profile', href: '/profile', label: 'Perfil', icon: CircleUserRound, testID: 'profile' },
]

// Barra inferior da área logada, sempre visível: fica abaixo de todas as telas
// (abas e as abertas a partir delas). Tocar numa aba fecha o que estiver aberto
// por cima e mostra a aba.
export function AppTabBar() {
  const insets = useSafeAreaInsets()
  // A aba acesa é a da tela atual; numa tela aberta a partir de uma aba
  // (evento, grupo...), continua acesa a última aba visitada
  const pathname = usePathname()
  const match = TABS.find((tab) => tab.href === pathname)?.name
  const [lastTab, setLastTab] = useState<TabName>('index')
  if (match && match !== lastTab) setLastTab(match)
  const current = match ?? lastTab

  function open(href: string) {
    if (router.canDismiss()) router.dismissAll()
    router.navigate(href as never)
  }

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom - 8, 4) }]} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const selected = tab.name === current
        const color = selected ? colors.primary : colors.text50
        return (
          <Pressable
            key={tab.name}
            testID={tab.testID}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            onPress={() => open(tab.href)}
            style={styles.tab}>
            <tab.icon size={21} color={color} />
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 6,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 40 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 10 },
})
