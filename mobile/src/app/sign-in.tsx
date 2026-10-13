import { Eye, EyeOff } from 'lucide-react-native'
import { useState } from 'react'
import { KeyboardAvoidingView, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Logo } from '@/components/logo'
import { Button, Card, Field, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { colors, fonts } from '@/lib/theme'

// Criar conta e recuperar senha ainda acontecem no site
const SITE_URL = 'https://www.tanalista.app'

export default function SignIn() {
  const { signIn } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

  return (
    <Screen>
      <SafeAreaView style={styles.flex}>
        {/* 'padding' nos dois sistemas: com a tela de ponta a ponta, o Android não
            redimensiona mais a janela sozinho e o teclado cobria o botão */}
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.brand}>
              <Logo size={26} />
              <Text style={styles.tagline}>Organize eventos com pagamento confirmado</Text>
            </View>

            <Card style={styles.card}>
              <View style={styles.cardBody}>
                <View>
                  <Text style={styles.title}>Entrar na sua conta</Text>
                  <Text style={styles.subtitle}>Bem-vindo de volta!</Text>
                </View>

                {error && (
                  <View style={styles.alert}>
                    <Text style={styles.alertText}>{error}</Text>
                  </View>
                )}

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
                      <Text style={styles.link}>Esqueceu a senha?</Text>
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
                      {showPassword ? (
                        <EyeOff size={18} color={colors.muted} />
                      ) : (
                        <Eye size={18} color={colors.muted} />
                      )}
                    </Pressable>
                  }
                />

                <Button testID="submit" label="Entrar" onPress={handleSubmit} loading={loading} />
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.footerText}>Não tem conta? </Text>
                <Pressable onPress={() => Linking.openURL(`${SITE_URL}/cadastro`)} hitSlop={8}>
                  <Text style={[styles.link, styles.footerLink]}>Criar conta grátis</Text>
                </Pressable>
              </View>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 18, gap: 28 },
  brand: { alignItems: 'center', gap: 10 },
  tagline: { fontFamily: fonts.body, fontSize: 14, color: colors.text35, textAlign: 'center' },
  card: { overflow: 'hidden' },
  cardBody: { padding: 20, gap: 18 },
  title: { fontFamily: fonts.heading, fontSize: 18, color: colors.foreground },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginTop: 4 },
  alert: {
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    backgroundColor: 'rgba(248,113,113,0.05)',
    borderRadius: 12,
    padding: 12,
  },
  alertText: { fontFamily: fonts.body, fontSize: 14, color: colors.destructive },
  link: { fontFamily: fonts.body, fontSize: 13, color: colors.primary },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingVertical: 16,
  },
  footerText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  footerLink: { fontFamily: fonts.bodySemi, fontSize: 14 },
})
