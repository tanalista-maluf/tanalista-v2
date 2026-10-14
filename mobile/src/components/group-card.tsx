import { Image } from 'expo-image'
import { Lock, MapPin, Users } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Badge } from '@/components/ui'
import { colors, fonts, radius } from '@/lib/theme'

export type GroupCardData = {
  id: string
  name: string
  city: string | null
  category: string | null
  visibility: string
  avatar_url: string | null
  member_count: number
}

// Foto do grupo, ou a inicial do nome quando não há foto
export function GroupAvatar({ group, size }: { group: Pick<GroupCardData, 'name' | 'avatar_url'>; size: number }) {
  const shape = { width: size, height: size, borderRadius: size / 4 }
  return (
    <View style={[styles.avatar, shape]}>
      {group.avatar_url ? (
        <Image source={group.avatar_url} style={shape} contentFit="cover" />
      ) : (
        <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{group.name.charAt(0).toUpperCase()}</Text>
      )}
    </View>
  )
}

export function memberLabel(count: number) {
  return count === 1 ? '1 membro' : `${count} membros`
}

// role: papel da pessoa no grupo, quando ela é membro
export function GroupCard({ group, role, onPress }: { group: GroupCardData; role?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${group.name}. ${memberLabel(group.member_count)}${group.city ? `. ${group.city}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <GroupAvatar group={group} size={48} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {group.name}
          </Text>
          {group.visibility === 'PRIVATE' && <Lock size={12} color={colors.text35} />}
        </View>
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Users size={12} color={colors.text35} />
            <Text style={styles.metaText}>{memberLabel(group.member_count)}</Text>
          </View>
          {group.city ? (
            <View style={[styles.metaItem, styles.city]}>
              <MapPin size={12} color={colors.text35} />
              <Text style={styles.metaText} numberOfLines={1}>
                {group.city}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      {role === 'OWNER' ? (
        <Badge label="Dono" tone="primary" />
      ) : group.category ? (
        <Badge label={group.category} tone="muted" />
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
  },
  pressed: { backgroundColor: 'rgba(255,255,255,0.045)', borderColor: 'rgba(74,222,128,0.2)' },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
  },
  initial: { fontFamily: fonts.headingBlack, color: colors.primary },
  body: { flex: 1, minWidth: 0, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  meta: { flexDirection: 'row', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  city: { flexShrink: 1 },
  metaText: { flexShrink: 1, fontFamily: fonts.body, fontSize: 12, color: colors.text35 },
})
