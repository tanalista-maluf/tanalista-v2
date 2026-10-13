import { Link, router } from 'expo-router'
import { Eye, EyeOff, MailCheck } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { AuthShell, authStyles } from '@/components/auth-shell'
import { Button, Field } from '@/components/ui'
import { useSession } from '@/ctx'
import { colors, fonts } from '@/lib/theme'

// Com 'newPassword' o iOS oferece criar e guardar uma senha forte. No simulador
// essa oferta engole o que o teste automatizado digita, então o build de
// desenvolvimento fica sem ela.
const PASSWORD_CONTENT_TYPE = __DEV__ ? 'oneTimeCode' : 'newPassword'

// Mesmas regras do cadastro no site (src/features/auth/schemas.ts). Em vez de
// pedir a senha duas vezes, o campo tem o botão de mostrar o que foi digitado.
function validate(fullName: string, email: string, password: string): string | null {
  if (fullName.length < 3) return 'Nome deve ter ao menos 3 caracteres.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'E-mail inválido.'
  if (password.length < 8) return 'A senha precisa de ao menos 8 caracteres.'
  if (!/[A-Z]/.test(password)) return 'A senha deve conter ao menos uma letra maiúscula.'
  if (!/[0-9]/.test(password)) return 'A senha deve conter ao menos um número.'
  return null
}

export default function SignUp() {
  const { signUp } = useSession()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function handleSubmit() {
    const name = fullName.trim()
    const address = email.trim().toLowerCase()
    const invalid = validate(name, address, password)
    if (invalid) {
      setError(invalid)
      return
    }
    setLoading(true)
    setError(null)
    // Se o cadastro já vier com sessão, o guard do layout raiz segue para o onboarding
    const result = await signUp(name, address, password)
    setLoading(false)
    if ('error' in result) setError(result.error)
    else if (result.confirmEmail) setSentTo(address)
  }

  if (sentTo) {
    return (
      <AuthShell title="Confirme seu e-mail" subtitle="Falta só um passo.">
        <View style={styles.sent}>
          <MailCheck size={36} color={colors.primary} />
          <Text testID="confirm-email" style={styles.sentText}>
            Enviamos um link de confirmação para {sentTo}. Abra o link e depois volte aqui para entrar.
          </Text>
        </View>
        <Button testID="back-to-sign-in" label="Ir para o login" onPress={() => router.replace('/sign-in')} />
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Criar conta"
      subtitle="É grátis e leva um minuto."
      error={error}
      footer={
        <>
          <Text style={authStyles.footerText}>Já tem conta? </Text>
          <Link href="/sign-in" replace style={authStyles.footerLink}>
            Entrar
          </Link>
        </>
      }>
      <Field
        testID="full-name"
        label="Nome completo"
        placeholder="Seu nome"
        autoCapitalize="words"
        textContentType="name"
        value={fullName}
        onChangeText={setFullName}
      />
      <Field
        testID="email"
        label="E-mail"
        placeholder="seu@email.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />
      <Field
        testID="password"
        label="Senha"
        secureTextEntry={!showPassword}
        textContentType={PASSWORD_CONTENT_TYPE}
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={handleSubmit}
        trailing={
          <Pressable
            onPress={() => setShowPassword((shown) => !shown)}
            accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            hitSlop={8}>
            {showPassword ? <EyeOff size={18} color={colors.muted} /> : <Eye size={18} color={colors.muted} />}
          </Pressable>
        }
      />
      <Text style={authStyles.hint}>Ao menos 8 caracteres, com uma letra maiúscula e um número.</Text>

      <Button testID="submit" label="Criar conta" onPress={handleSubmit} loading={loading} />
    </AuthShell>
  )
}

const styles = StyleSheet.create({
  sent: { alignItems: 'center', gap: 14, paddingVertical: 8 },
  sentText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.foreground, textAlign: 'center' },
})
