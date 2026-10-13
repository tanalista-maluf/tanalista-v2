import { Link } from 'expo-router'
import { Eye, EyeOff } from 'lucide-react-native'
import { useState } from 'react'
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { AuthShell, authStyles } from '@/components/auth-shell'
import { Button, Field } from '@/components/ui'
import { useSession } from '@/ctx'
import { colors, fonts, radius } from '@/lib/theme'

// Recuperar senha ainda acontece no site
const SITE_URL = 'https://www.tanalista.app'

export default function SignIn() {
  const { signIn, signInWithGoogle } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError('Informe e-mail e senha.')
      return
    }
    setLoading(true)
    setError(null)
    // Ao entrar, o guard do layout raiz troca esta tela pela área logada
    const message = await signIn(email.trim(), password)
    setLoading(false)
    if (message) setError(message)
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    setError(null)
    const message = await signInWithGoogle()
    setGoogleLoading(false)
    if (message) setError(message)
  }

  return (
    <AuthShell
      title="Entrar na sua conta"
      subtitle="Bem-vindo de volta!"
      error={error}
      footer={
        <>
          <Text style={authStyles.footerText}>Não tem conta? </Text>
          <Link href="/sign-up" testID="go-sign-up" style={authStyles.footerLink}>
            Criar conta grátis
          </Link>
        </>
      }>
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
        labelAction={
          <Pressable onPress={() => Linking.openURL(`${SITE_URL}/recuperar-senha`)} hitSlop={8}>
            <Text style={authStyles.link}>Esqueceu a senha?</Text>
          </Pressable>
        }
        secureTextEntry={!showPassword}
        textContentType="password"
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

      <Button testID="submit" label="Entrar" onPress={handleSubmit} loading={loading} />

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>ou</Text>
        <View style={styles.line} />
      </View>

      <Pressable
        testID="google"
        accessibilityRole="button"
        onPress={handleGoogle}
        disabled={googleLoading || loading}
        style={({ pressed }) => [styles.google, (pressed || googleLoading) && styles.dim]}>
        {googleLoading ? (
          <ActivityIndicator color={colors.foreground} />
        ) : (
          <>
            <Text style={styles.googleMark}>G</Text>
            <Text style={styles.googleText}>Continuar com Google</Text>
          </>
        )}
      </Pressable>
    </AuthShell>
  )
}

const styles = StyleSheet.create({
  google: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  googleMark: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.foreground },
  googleText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.foreground },
  dim: { opacity: 0.6 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: colors.cardBorder },
  dividerText: { fontFamily: fonts.body, fontSize: 12, color: colors.text35 },
})
