import { Image } from 'expo-image'
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Plus, ShoppingBag } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Badge, Button, Card, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { runAction, type Person } from '@/lib/api'
import { formatMoney, formatRelative } from '@/lib/format'
import { useHeaderInset } from '@/lib/header'
import { LISTING_TYPES } from '@/lib/marketplace'
import { colors, fonts } from '@/lib/theme'


type Listing = {
  id: string
  user_id: string
  title: string
  description: string
  type: string
  price: number | null
  price_negotiable: boolean
  payment_methods: string[]
  contact: string | null
  photo_url: string | null
  // Ausente antes da migration 20261018000001
  photo_urls?: string[]
  status: string
  published_at: string | null
  created_at: string
  profiles: Person
}

// Marketplace do grupo: anúncios ativos dos membros e os rascunhos da própria pessoa
export default function MarketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useSession()
  const userId = session!.user.id
  const headerInset = useHeaderInset()
  const [listings, setListings] = useState<Listing[] | null | undefined>(undefined)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    const result = await runAction<Listing[]>('groupListings', id)
    setListings('ok' in result ? result.ok : null)
  }, [id])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  async function act(name: string, listingId: string, success: string) {
    setMessage(null)
    const result = await runAction(name, listingId)
    setMessage('error' in result ? { ok: false, text: result.error } : { ok: true, text: success })
    await load()
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Marketplace' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingTop: 16 + headerInset }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              await load()
              setRefreshing(false)
            }}
            tintColor={colors.primary}
            progressViewOffset={headerInset}
          />
        }>
        <Button
          testID="market-new"
          label="Anunciar"
          icon={<Plus size={18} color={colors.primaryForeground} />}
          onPress={() => router.push({ pathname: '/groups/market/new', params: { groupId: id } })}
        />
        <Text style={styles.hint}>Cada anúncio custa R$ 1,00 da carteira e fica no ar por 30 dias. Até 5 ativos por grupo.</Text>
        {message && <Text style={[styles.notice, !message.ok && styles.error]}>{message.text}</Text>}

        {listings === undefined ? (
          <ActivityIndicator style={styles.loading} color={colors.primary} />
        ) : listings === null ? (
          <Text style={styles.empty}>Não foi possível carregar os anúncios.</Text>
        ) : listings.length === 0 ? (
          <View style={styles.emptyBox}>
            <ShoppingBag size={32} color={colors.text25} />
            <Text testID="market-empty" style={styles.empty}>
              Nenhum anúncio ainda.
            </Text>
          </View>
        ) : (
          listings.map((listing, index) => {
            const mine = listing.user_id === userId
            return (
              <Card key={listing.id} style={styles.listing}>
                <ListingPhotos urls={listing.photo_urls?.length ? listing.photo_urls : listing.photo_url ? [listing.photo_url] : []} />
                <View style={styles.listingHeader}>
                  <Badge label={LISTING_TYPES[listing.type] ?? listing.type} tone="primary" />
                  {listing.status === 'DRAFT' && <Badge label="Rascunho" tone="warning" />}
                </View>
                <Text testID={`listing-${index}`} style={styles.title}>
                  {listing.title}
                </Text>
                {listing.price != null && listing.price > 0 ? (
                  <Text style={styles.price}>
                    {formatMoney(listing.price)}
                    {listing.price_negotiable ? ' · negociável' : ''}
                  </Text>
                ) : null}
                <Text style={styles.description}>{listing.description}</Text>
                {listing.payment_methods.length > 0 && (
                  <Text style={styles.detail}>Pagamento: {listing.payment_methods.join(', ')}</Text>
                )}
                {listing.contact ? <Text style={styles.detail}>Contato: {listing.contact}</Text> : null}
                <Text style={styles.detail}>
                  {listing.profiles?.full_name ?? 'Membro'} · {formatRelative(listing.published_at ?? listing.created_at)}
                </Text>
                {mine && (
                  <View style={styles.actions}>
                    {listing.status === 'DRAFT' && (
                      <Pressable
                        testID={`listing-publish-${index}`}
                        accessibilityRole="button"
                        onPress={() => act('publishDraftListing', listing.id, 'Anúncio publicado.')}>
                        <Text style={styles.link}>Publicar (R$ 1,00)</Text>
                      </Pressable>
                    )}
                    <Pressable
                      testID={`listing-delete-${index}`}
                      accessibilityRole="button"
                      onPress={() =>
                        Alert.alert('Apagar anúncio?', listing.title, [
                          { text: 'Manter', style: 'cancel' },
                          { text: 'Apagar', style: 'destructive', onPress: () => act('deleteListing', listing.id, 'Anúncio apagado.') },
                        ])
                      }>
                      <Text style={styles.delete}>Apagar</Text>
                    </Pressable>
                  </View>
                )}
              </Card>
            )
          })
        )}
      </ScrollView>
    </Screen>
  )
}

// Fotos do anúncio: a principal grande e as outras numa faixa que rola de lado
function ListingPhotos({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
      {urls.map((url, index) => (
        <Image
          key={url}
          source={{ uri: url }}
          style={index === 0 ? styles.photoMain : styles.photo}
          contentFit="cover"
          accessibilityLabel={index === 0 ? 'Foto principal' : `Foto ${index + 1}`}
        />
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  photos: { gap: 8 },
  photoMain: { width: 220, height: 160, borderRadius: 12, backgroundColor: colors.input },
  photo: { width: 120, height: 160, borderRadius: 12, backgroundColor: colors.input },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  hint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.text40, textAlign: 'center' },
  notice: { fontFamily: fonts.body, fontSize: 14, color: colors.primary, textAlign: 'center' },
  error: { color: colors.destructive },
  loading: { marginTop: 48 },
  emptyBox: { alignItems: 'center', gap: 10, marginTop: 32 },
  empty: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, textAlign: 'center' },
  listing: { padding: 16, gap: 6 },
  listingHeader: { flexDirection: 'row', gap: 6 },
  title: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text, marginTop: 4 },
  price: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },
  description: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.foreground },
  detail: { fontFamily: fonts.body, fontSize: 12, color: colors.text50 },
  actions: { flexDirection: 'row', gap: 18, marginTop: 6 },
  link: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },
  delete: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.destructive },
})
