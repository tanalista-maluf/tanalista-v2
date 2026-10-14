import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Field, Screen } from '@/components/ui'
import { runAction } from '@/lib/api'
import { useHeaderInset } from '@/lib/header'
import { LISTING_TYPES } from '@/lib/marketplace'
import { colors, fonts, radius } from '@/lib/theme'

const PAYMENT_METHODS = ['PIX', 'Cartão', 'Dinheiro', 'Transferência', 'A combinar']

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
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (title.trim().length < 3) return setError('O título precisa de ao menos 3 caracteres.')
    if (description.trim().length < 10) return setError('A descrição precisa de ao menos 10 caracteres.')
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
