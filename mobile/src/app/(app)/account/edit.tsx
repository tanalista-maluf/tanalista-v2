import { router, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Field, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { fetchOwnProfile, updateProfile } from '@/lib/api'
import { useHeaderInset } from '@/lib/header'
import { colors, fonts, radius } from '@/lib/theme'

// Mesmas regras do site (src/features/perfil/profile.ts); o servidor confere de novo
function validate(fullName: string, phone: string, city: string): string | null {
  if (fullName.length < 2) return 'Nome muito curto.'
  if (!/^\d{10,11}$/.test(phone)) return 'Telefone inválido: DDD + número, só os dígitos.'
  if (city.length < 2) return 'Informe a cidade.'
  return null
}

export default function EditProfileScreen() {
  const { refreshProfile } = useSession()
  const insets = useSafeAreaInsets()
  const headerInset = useHeaderInset()
  const [loaded, setLoaded] = useState<boolean | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    fetchOwnProfile().then((result) => {
      if (!active) return
      if ('error' in result) {
        setLoaded(false)
        return
      }
      setFullName(result.full_name ?? '')
      setPhone(result.phone ?? '')
      setCity(result.city ?? '')
      setBio(result.bio ?? '')
      setLoaded(true)
    })
    return () => {
      active = false
    }
  }, [])

  async function handleSubmit() {
    const data = { full_name: fullName.trim(), phone: phone.replace(/\D/g, ''), city: city.trim(), bio: bio.trim() }
    const invalid = validate(data.full_name, data.phone, data.city)
    if (invalid) {
      setError(invalid)
      return
    }
    setSaving(true)
    setError(null)
    const result = await updateProfile(data)
    if ('error' in result) {
      setSaving(false)
      setError(result.error)
      return
    }
    await refreshProfile()
    router.back()
  }

  const header = <Stack.Screen options={{ title: 'Dados pessoais' }} />

  if (loaded === null) {
    return (
      <Screen>
        {header}
        <ActivityIndicator style={styles.flex} color={colors.primary} />
      </Screen>
    )
  }

  if (!loaded) {
    return (
      <Screen>
        {header}
        <Text style={styles.failed}>Não foi possível carregar seus dados. Volte e tente de novo.</Text>
      </Screen>
    )
  }

  return (
    <Screen>
      {header}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: 20 + headerInset }]}>
          <Field
            testID="edit-name"
            label="Nome completo"
            autoCapitalize="words"
            textContentType="name"
            value={fullName}
            onChangeText={setFullName}
            maxLength={100}
          />
          <Field
            testID="edit-phone"
            label="Telefone"
            placeholder="DDD + número"
            keyboardType="number-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={11}
          />
          <Field
            testID="edit-city"
            label="Cidade"
            autoCapitalize="words"
            value={city}
            onChangeText={setCity}
            maxLength={100}
          />
          <Field
            testID="edit-bio"
            label="Bio (opcional)"
            placeholder="Uma frase sobre você"
            value={bio}
            onChangeText={setBio}
            maxLength={500}
            multiline
            style={styles.multiline}
          />
          {error && (
            <Text testID="edit-error" style={styles.error}>
              {error}
            </Text>
          )}
        </ScrollView>

        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button testID="edit-submit" label="Salvar" onPress={handleSubmit} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  failed: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center', marginTop: 140, fontSize: 15, padding: 24 },
  content: { padding: 16, gap: 18, paddingBottom: 24 },
  multiline: { height: 110, paddingTop: 14, textAlignVertical: 'top', borderRadius: radius.card },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.destructive, textAlign: 'center' },
  bar: {
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
})
