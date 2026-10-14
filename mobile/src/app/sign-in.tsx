import * as AppleAuthentication from 'expo-apple-authentication'
import { Link } from 'expo-router'
import { Eye, EyeOff } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { AuthShell, authStyles } from '@/components/auth-shell'
import { Captcha, CAPTCHA_ENABLED } from '@/components/captcha'
import { Button, Field } from '@/components/ui'
import { useSession } from '@/ctx'
import { colors, fonts, radius } from '@/lib/theme'

// Liga quando a Apple estiver configurada no Supabase (Authentication > Providers > Apple)
const APPLE_ENABLED = process.env.EXPO_PUBLIC_APPLE_SIGN_IN === '1'

export default function SignIn() {
  const { signIn, signInWithGoogle, signInWithApple } = useSession()
  // No iPhone o botão é o nativo da Apple (se o aparelho tiver); no Android, a página da Apple
  const [appleAvailable, setAppleAvailable] = useState(APPLE_ENABLED && process.env.EXPO_OS !== 'ios')
  const [appleLoading, setAppleLoading] = useState(false)

  useEffect(() => {
    if (APPLE_ENABLED && process.env.EXPO_OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleAvailable)
  }, [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Token do captcha: vale para uma tentativa só, então troca a cada envio com erro
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaReset, setCaptchaReset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError('Informe e-mail e senha.')
      return
    }
    if (CAPTCHA_ENABLED && captchaToken === null) {
      setError('Aguarde a verificação de segurança terminar.')
      return
    }
    setLoading(true)
    setError(null)
    // Ao entrar, o guard do layout raiz troca esta tela pela área logada
    const message = await signIn(email.trim(), password, captchaToken ?? undefined)
    setLoading(false)
    if (message) {
      setError(message)
      setCaptchaReset((n) => n + 1)
    }
  }

  async function handleApple() {
    setAppleLoading(true)
    setError(null)
    const message = await signInWithApple()
    setAppleLoading(false)
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
          <Link href="/forgot-password" testID="go-forgot-password" style={authStyles.link}>
            Esqueceu a senha?
          </Link>
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

      <Captcha onToken={setCaptchaToken} resetKey={captchaReset} />
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

      {appleAvailable &&
        (process.env.EXPO_OS === 'ios' ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={24}
            onPress={handleApple}
            style={styles.appleNative}
          />
        ) : (
          <Pressable
            testID="apple"
            accessibilityRole="button"
            onPress={handleApple}
            disabled={appleLoading || loading}
            style={({ pressed }) => [styles.apple, (pressed || appleLoading) && styles.dim]}>
            {appleLoading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <>
                <Svg width={15} height={18} viewBox="0 0 814 1000">
                  <Path
                    fill="#000000"
                    d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"
                  />
                </Svg>
                <Text style={styles.appleText}>Continuar com Apple</Text>
              </>
            )}
          </Pressable>
        ))}
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
  appleNative: { height: 48 },
  apple: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
  },
  appleText: { fontFamily: fonts.bodySemi, fontSize: 15, color: '#000000' },
  googleMark: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.foreground },
  googleText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.foreground },
  dim: { opacity: 0.6 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: colors.cardBorder },
  dividerText: { fontFamily: fonts.body, fontSize: 12, color: colors.text35 },
})
