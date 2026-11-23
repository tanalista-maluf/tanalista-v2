import { Link, router, Stack, useLocalSearchParams } from 'expo-router'
import { Calendar, MapPin, Users } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button, Card, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { fetchPublicEvent, type PublicEventPreview } from '@/lib/api'
import { formatLongDate, formatMoney } from '@/lib/format'
import { colors, fonts, radius } from '@/lib/theme'

// Link público de evento (tanalista.app/e/[slug]) aberto de dentro do app —
// funciona sem sessão, igual à página pública do site (src/app/e/[slug]).
export default function PublicEventScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { session } = useSession()
  const [data, setData] = useState<PublicEventPreview | null | undefined>(undefined)

  useEffect(() => {
    let active = true
    fetchPublicEvent(slug).then((result) => {
      if (active) setData('error' in result ? null : result)
    })
    return () => {
      active = false
    }
  }, [slug])

  if (data === undefined) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <ActivityIndicator style={styles.centered} color={colors.primary} />
      </Screen>
    )
  }

  if (data === null) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <Text style={styles.notFound}>Evento não encontrado.</Text>
      </Screen>
    )
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {data.cover_url ? (
          <Image source={{ uri: data.cover_url }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverEmpty]} />
        )}

        <Text testID="public-event-title" style={styles.title}>
          {data.title}
        </Text>
        {data.groups && <Text style={styles.groupName}>{data.groups.name}</Text>}

        <Card style={styles.meta}>
          <View style={styles.metaRow}>
            <Calendar size={16} color={colors.primary} />
            <Text style={styles.metaText}>{formatLongDate(data.starts_at)}</Text>
          </View>
          <View style={styles.metaRow}>
            <MapPin size={16} color={colors.primary} />
            <Text style={styles.metaText}>
              {data.address} · {data.city}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Users size={16} color={colors.primary} />
            <Text style={styles.metaText}>
              {data.confirmed_count}/{data.capacity} confirmados
            </Text>
          </View>
        </Card>

        {data.description ? <Text style={styles.description}>{data.description}</Text> : null}

        {data.organizer && (
          <Text style={styles.organizer}>Organizado por @{data.organizer.username}</Text>
        )}

        <View style={styles.cta}>
          <Text style={styles.price}>{formatMoney(data.price)}</Text>
          {session ? (
            <Button
              testID="public-event-open"
              label="Ver evento completo"
              onPress={() => router.push({ pathname: '/events/[id]', params: { id: data.id } })}
            />
          ) : (
            <>
              <Button testID="public-event-sign-up" label="Criar conta para participar" onPress={() => router.push('/sign-up')} />
              <Link href="/sign-in" style={styles.signInLink}>
                Já tem conta? Entrar
              </Link>
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  centered: { flex: 1 },
  notFound: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center', marginTop: 140, fontSize: 15 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  cover: { height: 180, borderRadius: radius.card, backgroundColor: colors.input },
  coverEmpty: { backgroundColor: colors.card },
  title: { fontFamily: fonts.headingBlack, fontSize: 22, color: colors.text },
  groupName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text50, marginTop: -8 },
  meta: { padding: 14, gap: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaText: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text70 },
  description: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.foreground },
  organizer: { fontFamily: fonts.body, fontSize: 13, color: colors.text40 },
  cta: { gap: 10, marginTop: 8 },
  price: { fontFamily: fonts.headingBlack, fontSize: 24, color: colors.primary, textAlign: 'center' },
  signInLink: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary, textAlign: 'center' },
})
