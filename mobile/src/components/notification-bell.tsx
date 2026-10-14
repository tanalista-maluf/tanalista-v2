import { router, usePathname } from 'expo-router'
import { Bell } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSession } from '@/ctx'
import { supabase } from '@/lib/supabase'
import { colors, fonts } from '@/lib/theme'

// Sino do cabeçalho das abas, com o número de notificações não lidas. Reconta
// a cada troca de tela (inclusive ao voltar da central de notificações).
export function NotificationBell() {
  const { session } = useSession()
  const userId = session?.user.id
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!userId) return
    let active = true
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)
      .then(({ count }) => {
        if (active) setUnread(count ?? 0)
      })
    return () => {
      active = false
    }
  }, [userId, pathname])

  return (
    <Pressable
      testID="notifications"
      accessibilityRole="button"
      accessibilityLabel={unread ? `Notificações, ${unread} não lidas` : 'Notificações'}
      onPress={() => router.push('/notifications')}
      hitSlop={12}
      style={styles.bell}>
      <Bell size={22} color={colors.text70} />
      {unread > 0 && (
        <View testID="notifications-badge" style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  bell: { marginRight: 16 },
  badge: {
    position: 'absolute',
    top: -5,
    right: -7,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.destructive,
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 10, color: '#FFFFFF' },
})
