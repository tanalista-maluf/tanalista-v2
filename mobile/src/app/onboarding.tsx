import { useState } from 'react'
import { Pressable, Text } from 'react-native'
import { AuthShell, authStyles } from '@/components/auth-shell'
import { Button, Field } from '@/components/ui'
import { useSession } from '@/ctx'
import { completeOnboarding, type OnboardingField } from '@/lib/api'

// Mesmas regras do onboarding do site (src/features/auth/schemas.ts); o
// servidor valida de novo e confere se o username está livre
function validate(username: string, city: string, phone: string): { field: OnboardingField; message: string } | null {
  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    return { field: 'username', message: 'De 3 a 30 caracteres: letras minúsculas, números e _.' }
  }
  if (city.length < 2) return { field: 'city', message: 'Informe sua cidade.' }
  if (!/^\d{10,11}$/.test(phone)) return { field: 'phone', message: 'Informe DDD + número, só os dígitos.' }
  return null
}

// Quem acabou de criar a conta completa o perfil antes de entrar na área logada
export default function Onboarding() {
  const { profile, refreshProfile, signOut } = useSession()
  const [username, setUsername] = useState('')
  const [city, setCity] = useState(profile?.city ?? '')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<{ field?: OnboardingField; message: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    const data = { username: username.trim(), city: city.trim(), phone: phone.replace(/\D/g, '') }
    const invalid = validate(data.username, data.city, data.phone)
    if (invalid) {
      setError(invalid)
      return
    }
    setLoading(true)
    setError(null)
    const result = await completeOnboarding(data)
    if ('error' in result) {
      setLoading(false)
      setError({ field: 'field' in result ? result.field : undefined, message: result.error })
      return
    }
    // Com o perfil completo, o guard do layout raiz abre a área logada
    await refreshProfile()
    setLoading(false)
  }

  const fieldError = (field: OnboardingField) =>
    error?.field === field ? (
      <Text testID={`${field}-error`} style={authStyles.fieldError}>
        {error.message}
      </Text>
    ) : null

  return (
    <AuthShell
      title="Complete seu perfil"
      subtitle={profile ? `Olá, ${profile.full_name.split(' ')[0]}! Falta pouco.` : 'Falta pouco.'}
      error={error && !error.field ? error.message : null}
      footer={
        <Pressable testID="onboarding-sign-out" onPress={signOut} hitSlop={8}>
          <Text style={authStyles.footerText}>Sair</Text>
        </Pressable>
      }>
      <Field
        testID="username"
        label="Nome de usuário"
        placeholder="seu_usuario"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={30}
        value={username}
        onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
      />
      {fieldError('username') ?? <Text style={authStyles.hint}>É como os outros encontram você: @{username || 'seu_usuario'}</Text>}
      <Field
        testID="phone"
        label="WhatsApp"
        placeholder="11999998888"
        keyboardType="number-pad"
        textContentType="telephoneNumber"
        maxLength={15}
        value={phone}
        onChangeText={setPhone}
      />
      {fieldError('phone') ?? <Text style={authStyles.hint}>Os organizadores usam para falar com você sobre o evento.</Text>}
      {/* Por último: o teclado numérico do WhatsApp não tem tecla de concluir */}
      <Field
        testID="city"
        label="Cidade"
        placeholder="São Paulo"
        autoCapitalize="words"
        textContentType="addressCity"
        value={city}
        onChangeText={setCity}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />
      {fieldError('city')}

      <Button testID="submit" label="Concluir" onPress={handleSubmit} loading={loading} />
    </AuthShell>
  )
}
