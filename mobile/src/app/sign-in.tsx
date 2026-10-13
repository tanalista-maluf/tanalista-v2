import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSession } from '@/ctx'
import { colors, radius } from '@/lib/theme'

export default function SignIn() {
  const { signIn } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.form}>
        <Text style={styles.logo}>
          TáNa<Text style={styles.logoAccent}>Lista</Text>
        </Text>
        <Text style={styles.subtitle}>Entre para ver seus eventos</Text>

        <TextInput
          testID="email"
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          testID="password"
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor={colors.muted}
          secureTextEntry
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleSubmit}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          testID="submit"
          style={({ pressed }) => [styles.button, (pressed || loading) && styles.buttonPressed]}
          onPress={handleSubmit}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center' },
  form: { paddingHorizontal: 24, gap: 12 },
  logo: { fontSize: 36, fontWeight: '800', color: colors.foreground, textAlign: 'center' },
  logoAccent: { color: colors.primary },
  subtitle: { fontSize: 15, color: colors.muted, textAlign: 'center', marginBottom: 20 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.foreground,
  },
  error: { color: colors.destructive, fontSize: 14 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: colors.primaryForeground, fontSize: 16, fontWeight: '700' },
})
