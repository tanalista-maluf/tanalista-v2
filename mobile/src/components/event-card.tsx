import { LinearGradient } from 'expo-linear-gradient'
import { Lock, MapPin, Users } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Badge, OccupancyBar } from '@/components/ui'
import { dateParts, formatPrice } from '@/lib/format'
import { colors, fonts, radius } from '@/lib/theme'

export type EventCardData = {
  id: string
  title: string
  starts_at: string
  city: string
  price: number
  capacity: number
  confirmed_count: number
  visibility: string
  groups: { name: string } | null
}

// Mesmo desenho do cartão do site (src/features/eventos/components/EventCard.tsx):
// barra lateral colorida pela lotação, bloco de data, e preço à direita
export type EventCardBadge = { label: string; tone: 'primary' | 'warning' | 'danger' | 'muted' }

// badge troca o preço por outra etiqueta (ex.: a situação da inscrição em "Meus eventos")
export function EventCard({
  event,
  badge,
  onPress,
}: {
  event: EventCardData
  badge?: EventCardBadge
  onPress: () => void
}) {
  const { day, month, time } = dateParts(event.starts_at)
  const pct = event.capacity > 0 ? event.confirmed_count / event.capacity : 0
  const isFull = pct >= 1
  const almostFull = !isFull && pct >= 0.8
  const spots = isFull ? 'Esgotado' : `${event.confirmed_count}/${event.capacity} inscritos`
  const accent = isFull ? colors.destructive : almostFull ? colors.warning : null

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}. ${day} de ${month}, ${time}. ${badge?.label ?? formatPrice(event.price)}. ${spots}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, isFull && styles.cardFull, pressed && styles.cardPressed]}>
      {accent ? (
        <View style={[styles.accent, { backgroundColor: accent }]} />
      ) : (
        <LinearGradient colors={[colors.primary, colors.emerald]} style={styles.accent} />
      )}

      <View style={styles.date}>
        <Text style={[styles.day, isFull && styles.dayFull]}>{day}</Text>
        <Text style={[styles.month, isFull && styles.monthFull]}>{month}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>
          {event.visibility !== 'PUBLIC' && <Lock size={12} color={colors.text35} style={styles.lock} />}
        </View>
        {event.groups?.name ? (
          <Text style={styles.group} numberOfLines={1}>
            {event.groups.name}
          </Text>
        ) : null}

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <MapPin size={12} color={colors.text35} />
            <Text style={styles.metaText}>{event.city}</Text>
          </View>
          <View style={styles.metaItem}>
            <Users size={12} color={colors.text35} />
            <Text style={styles.metaText}>
              {event.confirmed_count}/{event.capacity}
            </Text>
          </View>
        </View>

        <View style={styles.occupancy}>
          <View style={styles.occupancyBar}>
            <OccupancyBar confirmed={event.confirmed_count} capacity={event.capacity} />
          </View>
          {almostFull && <Text style={styles.lastSpots}>Últimas {event.capacity - event.confirmed_count}</Text>}
        </View>
      </View>

      <View style={styles.side}>
        {badge ? (
          <Badge label={badge.label} tone={badge.tone} />
        ) : isFull ? (
          <Badge label="Esgotado" tone="danger" />
        ) : (
          <Badge label={formatPrice(event.price)} tone={event.price === 0 ? 'warning' : 'primary'} />
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  cardFull: { opacity: 0.75 },
  cardPressed: { backgroundColor: 'rgba(255,255,255,0.045)', borderColor: 'rgba(74,222,128,0.2)' },
  accent: { width: 3 },
  date: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
  },
  day: { fontFamily: fonts.headingBlack, fontSize: 24, lineHeight: 26, color: colors.primary, letterSpacing: -0.5 },
  dayFull: { color: 'rgba(248,113,113,0.7)' },
  month: { fontFamily: fonts.bodySemi, fontSize: 12, color: 'rgba(74,222,128,0.6)', textTransform: 'capitalize', marginTop: 2 },
  monthFull: { color: 'rgba(248,113,113,0.4)' },
  time: { fontFamily: fonts.body, fontSize: 12, color: colors.text25, marginTop: 4 },
  body: { flex: 1, minWidth: 0, paddingHorizontal: 14, paddingVertical: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  title: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20, color: colors.text },
  lock: { marginTop: 4 },
  group: { fontFamily: fonts.body, fontSize: 12, color: colors.text35, marginTop: 2 },
  meta: { flexDirection: 'row', gap: 12, marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: fonts.body, fontSize: 12, color: colors.text35 },
  occupancy: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  occupancyBar: { flex: 1 },
  lastSpots: { fontFamily: fonts.bodySemi, fontSize: 10, color: 'rgba(250,204,21,0.8)' },
  side: { justifyContent: 'center', paddingRight: 14, paddingLeft: 4 },
})
