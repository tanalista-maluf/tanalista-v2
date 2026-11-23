import { Link, router, Stack, useLocalSearchParams } from 'expo-router'
import { Lock, MapPin, Users } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button, Card, Screen } from '@/components/ui'
import { GroupAvatar } from '@/components/group-card'
import { useSession } from '@/ctx'
import { fetchPublicGroup, type PublicGroupPreview } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { colors, fonts } from '@/lib/theme'

// Link público de grupo (tanalista.app/g/[slug]) aberto de dentro do app —
// funciona sem sessão, igual à página pública do site (src/app/g/[slug]).
export default function PublicGroupScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { session } = useSession()
  const [data, setData] = useState<PublicGroupPreview | null | undefined>(undefined)

  useEffect(() => {
    let active = true
    fetchPublicGroup(slug).then((result) => {
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
        <Text style={styles.notFound}>Grupo não encontrado.</Text>
      </Screen>
    )
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <GroupAvatar group={data} size={72} />
          <Text testID="public-group-name" style={styles.name}>
            {data.name}
          </Text>
          <View style={styles.metaRow}>
            {data.visibility === 'PRIVATE' && <Lock size={13} color={colors.text50} />}
            {data.city && <Text style={styles.metaText}>{data.city}</Text>}
            <Users size={13} color={colors.text50} />
            <Text style={styles.metaText}>{data.member_count} membros</Text>
          </View>
        </View>

        {data.description ? <Text style={styles.description}>{data.description}</Text> : null}

        {data.upcoming_events.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Próximos eventos</Text>
            {data.upcoming_events.map((event) => (
              <Card key={event.id} style={styles.eventRow}>
                <MapPin size={14} color={colors.primary} />
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventPrice}>{formatMoney(event.price)}</Text>
              </Card>
            ))}
          </View>
        )}

        <View style={styles.cta}>
          {session ? (
            <Button
              testID="public-group-open"
              label="Ver grupo"
              onPress={() => router.push({ pathname: '/groups/preview/[slug]', params: { slug: data.slug } })}
            />
          ) : (
            <>
              <Button testID="public-group-sign-up" label="Criar conta para entrar" onPress={() => router.push('/sign-up')} />
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
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  hero: { alignItems: 'center', gap: 8 },
  name: { fontFamily: fonts.headingBlack, fontSize: 20, color: colors.text, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: fonts.body, fontSize: 13, color: colors.text50 },
  description: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.foreground, textAlign: 'center' },
  section: { gap: 8 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.text40 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  eventTitle: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  eventPrice: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.primary },
  cta: { gap: 10, marginTop: 8 },
  signInLink: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary, textAlign: 'center' },
})
