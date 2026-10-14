import { router, Stack, useLocalSearchParams } from 'expo-router'
import { MapPin, Star } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Avatar } from '@/components/avatar'
import { EventCard } from '@/components/event-card'
import { GroupCard } from '@/components/group-card'
import { Card, Screen } from '@/components/ui'
import { fetchPublicProfile, type PublicProfile } from '@/lib/api'
import { useHeaderInset } from '@/lib/header'
import { colors, fonts } from '@/lib/theme'

// Perfil público: o que qualquer pessoa logada vê de outra (ou de si mesma)
export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>()
  const headerInset = useHeaderInset()
  const [data, setData] = useState<PublicProfile | null | undefined>(undefined)

  useEffect(() => {
    let active = true
    fetchPublicProfile(username).then((result) => {
      if (active) setData('error' in result ? null : result)
    })
    return () => {
      active = false
    }
  }, [username])

  const header = <Stack.Screen options={{ title: '' }} />

  if (data === undefined) {
    return (
      <Screen>
        {header}
        <ActivityIndicator style={styles.centered} color={colors.primary} />
      </Screen>
    )
  }

  if (data === null) {
    return (
      <Screen>
        {header}
        <Text style={styles.notFound}>Perfil não encontrado.</Text>
      </Screen>
    )
  }

  const { profile, stats, events, groups } = data
  const name = profile.full_name ?? `@${profile.username}`

  return (
    <Screen>
      {header}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingTop: 16 + headerInset }]}>
        <Card style={styles.hero}>
          <Avatar name={name} url={profile.avatar_url} size={72} />
          <View style={styles.heroBody}>
            <Text testID="public-name" style={styles.name}>
              {name}
            </Text>
            <Text style={styles.username}>@{profile.username}</Text>
            {profile.city ? (
              <View style={styles.city}>
                <MapPin size={13} color={colors.text50} />
                <Text style={styles.cityText}>{profile.city}</Text>
              </View>
            ) : null}
          </View>
        </Card>
        {profile.bio ? (
          <Text testID="public-bio" style={styles.bio}>
            {profile.bio}
          </Text>
        ) : null}

        <View style={styles.stats}>
          <Stat value={String(stats.organized)} label="Eventos organizados" />
          <Stat value={String(stats.participations)} label="Participações" />
          <Stat value={String(stats.groups)} label="Grupos" />
          <Stat
            value={stats.rating === null ? '—' : String(stats.rating).replace('.', ',')}
            label="Avaliação"
            star={stats.rating !== null}
          />
        </View>

        {events.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Eventos</Text>
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
              />
            ))}
          </View>
        )}

        {groups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Grupos</Text>
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onPress={() => router.push({ pathname: '/groups/[id]', params: { id: group.id } })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  )
}

function Stat({ value, label, star }: { value: string; label: string; star?: boolean }) {
  return (
    <Card style={styles.stat}>
      <View style={styles.statValueRow}>
        {star && <Star size={13} color={colors.warning} fill={colors.warning} />}
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  )
}

const styles = StyleSheet.create({
  centered: { flex: 1 },
  notFound: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center', marginTop: 140, fontSize: 15 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18 },
  heroBody: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.headingBlack, fontSize: 20, letterSpacing: -0.4, color: colors.text },
  username: { fontFamily: fonts.body, fontSize: 14, color: colors.text50 },
  city: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cityText: { fontFamily: fonts.body, fontSize: 13, color: colors.text50 },
  bio: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.foreground },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, gap: 4 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontFamily: fonts.headingBlack, fontSize: 19, color: colors.text },
  statLabel: { fontFamily: fonts.body, fontSize: 10, lineHeight: 13, color: colors.text40, textAlign: 'center' },
  section: { gap: 10 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.text40 },
})
