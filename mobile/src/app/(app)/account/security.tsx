import { Stack } from 'expo-router'
import { Eye, EyeOff } from 'lucide-react-native'
import { useState } from 'react'
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { Button, Card, Field, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { apiUrl } from '@/lib/api'
import { useHeaderInset } from '@/lib/header'
import { supabase } from '@/lib/supabase'
import { colors, fonts } from '@/lib/theme'

// Mesmo motivo de sign-up.tsx: a oferta de senha forte do iOS engole o que o
// teste automatizado digita
const PASSWORD_CONTENT_TYPE = __DEV__ ? 'oneTimeCode' : 'newPassword'

// Mesmas regras de senha do cadastro
function validatePassword(password: string): string | null {
  if (password.length < 8) return 'A senha precisa de ao menos 8 caracteres.'
  if (!/[A-Z]/.test(password)) return 'A senha deve conter ao menos uma letra maiúscula.'
  if (!/[0-9]/.test(password)) return 'A senha deve conter ao menos um número.'
  return null
}

type Notice = { ok: boolean; text: string }

export default function SecurityScreen() {
  const { session, updatePassword } = useSession()
  const headerInset = useHeaderInset()
  const currentEmail = session?.user.email ?? ''

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordNotice, setPasswordNotice] = useState<Notice | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  const [email, setEmail] = useState('')
  const [emailNotice, setEmailNotice] = useState<Notice | null>(null)
  const [savingEmail, setSavingEmail] = useState(false)

  async function handlePassword() {
    const invalid = validatePassword(password)
    if (invalid) {
      setPasswordNotice({ ok: false, text: invalid })
      return
    }
    setSavingPassword(true)
    setPasswordNotice(null)
    const message = await updatePassword(password)
    setSavingPassword(false)
    if (message) {
      setPasswordNotice({ ok: false, text: message })
    } else {
      setPassword('')
      setPasswordNotice({ ok: true, text: 'Senha alterada.' })
    }
  }

  async function handleEmail() {
    const address = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setEmailNotice({ ok: false, text: 'E-mail inválido.' })
      return
    }
    if (address === currentEmail) {
      setEmailNotice({ ok: false, text: 'Este já é o seu e-mail.' })
      return
    }
    setSavingEmail(true)
    setEmailNotice(null)
    // O e-mail só troca depois de a pessoa abrir o link enviado ao endereço novo
    const { error } = await supabase.auth.updateUser(
      { email: address },
      { emailRedirectTo: `${apiUrl}/app/email-confirmado` }
    )
    setSavingEmail(false)
    if (error) {
      setEmailNotice({
        ok: false,
        text:
          error.code === 'email_exists'
            ? 'Este e-mail já está em uso.'
            : error.status
              ? 'Erro ao atualizar e-mail. Tente novamente.'
              : 'Não foi possível salvar. Verifique sua conexão e tente de novo.',
      })
    } else {
      setEmail('')
      setEmailNotice({ ok: true, text: `Enviamos um link de confirmação para ${address}. O e-mail muda quando você abrir o link.` })
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Senha e e-mail' }} />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: 20 + headerInset }]}>
          <Card style={styles.card}>
            <Text style={styles.title}>Alterar senha</Text>
            <Field
              testID="security-password"
              label="Senha nova"
              secureTextEntry={!showPassword}
              textContentType={PASSWORD_CONTENT_TYPE}
              value={password}
              onChangeText={setPassword}
              trailing={
                <Pressable
                  onPress={() => setShowPassword((shown) => !shown)}
                  accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  hitSlop={8}>
                  {showPassword ? <EyeOff size={18} color={colors.muted} /> : <Eye size={18} color={colors.muted} />}
                </Pressable>
              }
            />
            <Text style={styles.hint}>Ao menos 8 caracteres, com uma letra maiúscula e um número.</Text>
            {passwordNotice && (
              <Text testID="security-password-notice" style={[styles.notice, !passwordNotice.ok && styles.noticeError]}>
                {passwordNotice.text}
              </Text>
            )}
            <Button testID="security-password-submit" label="Salvar senha" onPress={handlePassword} loading={savingPassword} />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.title}>Alterar e-mail</Text>
            <Text style={styles.hint}>E-mail atual: {currentEmail}</Text>
            <Field
              testID="security-email"
              label="E-mail novo"
              placeholder="novo@email.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
            />
            {emailNotice && (
              <Text testID="security-email-notice" style={[styles.notice, !emailNotice.ok && styles.noticeError]}>
                {emailNotice.text}
              </Text>
            )}
            <Button testID="security-email-submit" label="Enviar confirmação" onPress={handleEmail} loading={savingEmail} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  card: { padding: 18, gap: 14 },
  title: { fontFamily: fonts.heading, fontSize: 17, color: colors.foreground },
  hint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.text50, marginTop: -6 },
  notice: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.primary },
  noticeError: { color: colors.destructive },
})
