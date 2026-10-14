import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { ImagePlus, X } from 'lucide-react-native'
import { useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Field, Screen } from '@/components/ui'
import { runAction, uploadListingPhoto } from '@/lib/api'
import { useHeaderInset } from '@/lib/header'
import { LISTING_TYPES } from '@/lib/marketplace'
import { colors, fonts, radius } from '@/lib/theme'

const PAYMENT_METHODS = ['PIX', 'Cartão', 'Dinheiro', 'Transferência', 'A combinar']
// Mesmos limites do servidor (src/features/marketplace/photos.ts)
const MAX_PHOTOS = 5
const MAX_PHOTO_BYTES = 4 * 1024 * 1024

// Foto escolhida: aparece na hora (uri) e sobe em seguida (url)
type Photo = { key: string; uri: string; url?: string }

// Anúncio novo no marketplace do grupo. Com saldo na carteira ele já sai
// publicado (R$ 1,00); sem saldo vira rascunho, como no site.
export default function NewListingScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>()
  const insets = useSafeAreaInsets()
  const headerInset = useHeaderInset()
  const [type, setType] = useState('SELL')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [negotiable, setNegotiable] = useState(false)
  const [methods, setMethods] = useState<string[]>([])
  const [contact, setContact] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Cada foto sobe assim que é escolhida; a primeira da lista é a principal
  async function addPhotos() {
    setError(null)
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.6,
      base64: true,
    })
    if (picked.canceled) return

    const accepted: { photo: Photo; base64: string; mimeType: string }[] = []
    let tooBig = 0
    for (const asset of picked.assets.slice(0, MAX_PHOTOS - photos.length)) {
      if (!asset.base64) continue
      const size = asset.fileSize ?? Math.floor(asset.base64.length * 0.75)
      if (size > MAX_PHOTO_BYTES) {
        tooBig++
        continue
      }
      const photo = { key: `${asset.assetId ?? asset.uri}-${Date.now()}`, uri: asset.uri }
      accepted.push({ photo, base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' })
    }
    if (tooBig) setError(tooBig === 1 ? 'Uma foto passou de 4MB e ficou de fora.' : `${tooBig} fotos passaram de 4MB e ficaram de fora.`)
    if (accepted.length === 0) return

    setPhotos((current) => [...current, ...accepted.map((item) => item.photo)])
    for (const item of accepted) {
      const result = await uploadListingPhoto({ base64: item.base64, mimeType: item.mimeType })
      if ('error' in result) {
        setError(result.error)
        setPhotos((current) => current.filter((photo) => photo.key !== item.photo.key))
      } else {
        setPhotos((current) => current.map((photo) => (photo.key === item.photo.key ? { ...photo, url: result.url } : photo)))
      }
    }
  }

  function makeMain(key: string) {
    setPhotos((current) => [...current.filter((photo) => photo.key === key), ...current.filter((photo) => photo.key !== key)])
  }

  async function handleSubmit() {
    if (title.trim().length < 3) return setError('O título precisa de ao menos 3 caracteres.')
    if (description.trim().length < 10) return setError('A descrição precisa de ao menos 10 caracteres.')
    if (photos.some((photo) => !photo.url)) return setError('Aguarde as fotos terminarem de enviar.')
    setSaving(true)
    setError(null)
    const result = await runAction<{ isDraft?: boolean }>('createListing', groupId, {
      title: title.trim(),
      description: description.trim(),
      type,
      price: price.trim(),
      price_negotiable: negotiable,
      payment_methods: methods,
      contact: contact.trim(),
      photo_url: '',
      photo_urls: photos.map((photo) => photo.url!),
    })
    setSaving(false)
    if ('error' in result) return setError(result.error)
    router.back()
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Novo anúncio' }} />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: 20 + headerInset }]}>
          <View style={styles.chips}>
            {Object.entries(LISTING_TYPES).map(([value, label], index) => (
              <Pressable
                key={value}
                testID={`listing-type-${index}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: type === value }}
                onPress={() => setType(value)}
                style={[styles.chip, type === value && styles.chipSelected]}>
                <Text style={[styles.chipText, type === value && styles.chipTextSelected]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.photosBlock}>
            <Text style={styles.label}>
              Fotos ({photos.length}/{MAX_PHOTOS})
            </Text>
            <View style={styles.photos}>
              {photos.map((photo, index) => (
                <Pressable
                  key={photo.key}
                  testID={`listing-photo-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={index === 0 ? 'Foto principal' : 'Tornar esta foto a principal'}
                  onPress={() => index > 0 && makeMain(photo.key)}
                  style={[styles.photo, index === 0 && styles.photoMain]}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} contentFit="cover" />
                  {!photo.url && (
                    <View style={styles.photoLoading}>
                      <ActivityIndicator color={colors.primary} />
                    </View>
                  )}
                  {index === 0 && (
                    <View style={styles.mainBadge}>
                      <Text style={styles.mainBadgeText}>Principal</Text>
                    </View>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remover foto"
                    onPress={() => setPhotos((current) => current.filter((item) => item.key !== photo.key))}
                    hitSlop={8}
                    style={styles.photoRemove}>
                    <X size={14} color="#FFFFFF" />
                  </Pressable>
                </Pressable>
              ))}
              {photos.length < MAX_PHOTOS && (
                <Pressable
                  testID="listing-add-photo"
                  accessibilityRole="button"
                  accessibilityLabel="Adicionar fotos"
                  onPress={addPhotos}
                  style={[styles.photo, styles.photoAdd]}>
                  <ImagePlus size={22} color={colors.primary} />
                  <Text style={styles.photoAddText}>Adicionar</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.photoHint}>
              Até {MAX_PHOTOS} fotos de até 4MB cada. A primeira é a principal; toque em outra para trocar.
            </Text>
          </View>
          <Field testID="listing-title" label="Título" value={title} onChangeText={setTitle} maxLength={100} />
          <Field
            testID="listing-description"
            label="Descrição"
            value={description}
            onChangeText={setDescription}
            maxLength={1500}
            multiline
            style={styles.multiline}
          />
          <Field
            testID="listing-price"
            label="Preço (R$, opcional)"
            keyboardType="decimal-pad"
            value={price}
            onChangeText={setPrice}
          />
          <View style={styles.toggle}>
            <Text style={styles.toggleText}>Preço negociável</Text>
            <Switch
              value={negotiable}
              onValueChange={setNegotiable}
              trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.15)' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Text style={styles.label}>Formas de pagamento</Text>
          <View style={styles.chips}>
            {PAYMENT_METHODS.map((method) => {
              const selected = methods.includes(method)
              return (
                <Pressable
                  key={method}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() => setMethods(selected ? methods.filter((m) => m !== method) : [...methods, method])}
                  style={[styles.chip, selected && styles.chipSelected]}>
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{method}</Text>
                </Pressable>
              )
            })}
          </View>
          <Field
            testID="listing-contact"
            label="Contato (opcional)"
            placeholder="WhatsApp, e-mail ou como falar com você"
            value={contact}
            onChangeText={setContact}
            maxLength={200}
          />
          {error && (
            <Text testID="listing-error" style={styles.error}>
              {error}
            </Text>
          )}
        </ScrollView>
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button testID="listing-submit" label="Publicar anúncio" onPress={handleSubmit} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  photosBlock: { gap: 8 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: 76, height: 76, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.input },
  photoMain: { borderWidth: 2, borderColor: colors.primary },
  photoImage: { width: '100%', height: '100%' },
  photoLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,26,20,0.6)',
  },
  mainBadge: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingVertical: 2, backgroundColor: 'rgba(74,222,128,0.9)' },
  mainBadgeText: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.primaryForeground, textAlign: 'center' },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  photoAdd: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(74,222,128,0.4)',
  },
  photoAddText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.primary },
  photoHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.text50 },
  content: { padding: 16, gap: 16, paddingBottom: 24 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: 'rgba(74,222,128,0.7)' },
  multiline: { height: 110, paddingTop: 14, textAlignVertical: 'top', borderRadius: radius.card },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  chipSelected: { borderColor: 'rgba(74,222,128,0.45)', backgroundColor: 'rgba(74,222,128,0.1)' },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text70 },
  chipTextSelected: { color: colors.primary },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.destructive, textAlign: 'center' },
  bar: {
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
})
