import { Link, router } from 'expo-router'
import { MailCheck } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AuthShell, authStyles } from '@/components/auth-shell'
import { Button, Field } from '@/components/ui'
import { useSession } from '@/ctx'
import { colors, fonts } from '@/lib/theme'

export default function ForgotPassword() {
  const { requestPasswordReset } = useSession()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function handleSubmit() {
    const address = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError('E-mail inválido.')
      return
    }
    setLoading(true)
    setError(null)
    const message = await requestPasswordReset(address)
    setLoading(false)
    if (message) setError(message)
    else setSentTo(address)
  }

  if (sentTo) {
    return (
      <AuthShell title="Confira seu e-mail" subtitle="O link vale por pouco tempo.">
        <View style={styles.sent}>
          <MailCheck size={36} color={colors.primary} />
          <Text testID="reset-sent" style={styles.sentText}>
            Se existe uma conta com {sentTo}, enviamos um link para criar uma senha nova. Abra o link neste aparelho.
          </Text>
        </View>
        <Button testID="back-to-sign-in" label="Voltar ao login" onPress={() => router.replace('/sign-in')} />
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Enviamos um link para você criar uma senha nova."
      error={error}
      footer={
        <>
          <Text style={authStyles.footerText}>Lembrou a senha? </Text>
          <Link href="/sign-in" replace style={authStyles.footerLink}>
            Entrar
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
        onSubmitEditing={handleSubmit}
      />
      <Button testID="submit" label="Enviar link" onPress={handleSubmit} loading={loading} />
    </AuthShell>
  )
}

const styles = StyleSheet.create({
  sent: { alignItems: 'center', gap: 14, paddingVertical: 8 },
  sentText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.foreground, textAlign: 'center' },
})
