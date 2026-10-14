import { router } from 'expo-router'
import { CalendarDays, CircleUserRound, House, UsersRound, Wallet, type LucideIcon } from 'lucide-react-native'
import { useSyncExternalStore } from 'react'
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

// Aba atual, avisada pelo layout das abas a cada troca
let activeTab: TabName = 'index'
const listeners = new Set<() => void>()

export function setActiveTab(name: string) {
  if (name === activeTab || !TABS.some((tab) => tab.name === name)) return
  activeTab = name as TabName
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Barra inferior da área logada, sempre visível: fica abaixo de todas as telas
// (abas e as abertas a partir delas). Tocar numa aba fecha o que estiver aberto
// por cima e mostra a aba.
export function AppTabBar() {
  const insets = useSafeAreaInsets()
  const current = useSyncExternalStore(subscribe, () => activeTab)

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
