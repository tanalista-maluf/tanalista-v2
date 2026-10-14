import { router, Stack, useLocalSearchParams } from 'expo-router'
import { Clock, Lock, MapPin, Users } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { GroupAvatar, memberLabel } from '@/components/group-card'
import { Badge, Button, Card, Screen } from '@/components/ui'
import { joinGroup, runAction } from '@/lib/api'
import { useHeaderInset } from '@/lib/header'
import { colors, fonts } from '@/lib/theme'

type Preview = {
  group: {
    id: string
    slug: string | null
    name: string
    description: string | null
    city: string | null
    category: string | null
    avatar_url: string | null
    visibility: string
    member_count: number
  }
  status: 'MEMBER' | 'REQUESTED' | 'NONE'
}

// Grupo visto por quem ainda não é membro, aberto por um link /g/<slug>: o
// grupo público dá para entrar na hora; o privado, pedir para entrar (o dono aprova)
export default function GroupPreviewScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const headerInset = useHeaderInset()
  const [preview, setPreview] = useState<Preview | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    runAction<Preview>('groupPreview', slug).then((result) => {
      if (!active) return
      const data = 'ok' in result ? result.ok : null
      // Já é membro: vai direto para a página do grupo
      if (data?.status === 'MEMBER') router.replace({ pathname: '/groups/[id]', params: { id: data.group.id } })
      else setPreview(data)
    })
    return () => {
      active = false
    }
  }, [slug])

  async function handleJoin() {
    if (!preview) return
    setBusy(true)
    setError(null)
    if (preview.group.visibility === 'PRIVATE') {
      const result = await runAction('requestGroupJoin', preview.group.id)
      if ('error' in result) setError(result.error)
      else setPreview({ ...preview, status: 'REQUESTED' })
    } else {
      const result = await joinGroup(preview.group.id)
      if ('error' in result) setError(result.error)
      else router.replace({ pathname: '/groups/[id]', params: { id: preview.group.id } })
    }
    setBusy(false)
  }

  if (preview === undefined) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <ActivityIndicator style={styles.flex} color={colors.primary} />
      </Screen>
    )
  }

  if (preview === null) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <Text style={styles.message}>Grupo não encontrado.</Text>
      </Screen>
    )
  }

  const { group } = preview
  const isPrivate = group.visibility === 'PRIVATE'

  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingTop: 16 + headerInset }]}>
        <Card style={styles.hero}>
          <GroupAvatar group={group} size={72} />
          <View style={styles.badges}>
            {isPrivate && <Badge label="Privado" tone="muted" />}
            {group.category && <Badge label={group.category} tone="primary" />}
          </View>
          <Text testID="group-preview-name" style={styles.name}>
            {group.name}
          </Text>
          <View style={styles.meta}>
            <Users size={15} color={colors.text50} />
            <Text style={styles.metaText}>{memberLabel(group.member_count)}</Text>
            {group.city && (
              <>
                <MapPin size={15} color={colors.text50} />
                <Text style={styles.metaText}>{group.city}</Text>
              </>
            )}
          </View>
          {group.description ? <Text style={styles.description}>{group.description}</Text> : null}
        </Card>

        {preview.status === 'REQUESTED' ? (
          <Card style={styles.pending}>
            <Clock size={20} color={colors.warning} />
            <Text testID="group-preview-requested" style={styles.pendingText}>
              Pedido enviado. Você entra no grupo assim que o dono aprovar.
            </Text>
          </Card>
        ) : (
          <>
            {isPrivate && (
              <View style={styles.hint}>
                <Lock size={15} color={colors.text50} />
                <Text style={styles.hintText}>Grupo privado: o dono precisa aprovar a sua entrada.</Text>
              </View>
            )}
            <Button
              testID="group-preview-join"
              label={isPrivate ? 'Pedir para entrar' : 'Entrar no grupo'}
              onPress={handleJoin}
              loading={busy}
            />
          </>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  message: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center', marginTop: 120, fontSize: 15 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  hero: { alignItems: 'center', gap: 10, padding: 20 },
  badges: { flexDirection: 'row', gap: 6 },
  name: { fontFamily: fonts.headingBlack, fontSize: 24, color: colors.foreground, textAlign: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: fonts.body, fontSize: 14, color: colors.text50, marginRight: 8 },
  description: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text70, textAlign: 'center' },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  pendingText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, color: colors.foreground },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  hintText: { fontFamily: fonts.body, fontSize: 13, color: colors.text50 },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.destructive, textAlign: 'center' },
})
