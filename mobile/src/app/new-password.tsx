import { Eye, EyeOff } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Text } from 'react-native'
import { AuthShell, authStyles } from '@/components/auth-shell'
import { Button, Field } from '@/components/ui'
import { useSession } from '@/ctx'
import { colors } from '@/lib/theme'

// Mesmo motivo de sign-up.tsx: a oferta de senha forte do iOS engole o que o
// teste automatizado digita
const PASSWORD_CONTENT_TYPE = __DEV__ ? 'oneTimeCode' : 'newPassword'

// Mesmas regras de senha do cadastro
function validate(password: string): string | null {
  if (password.length < 8) return 'A senha precisa de ao menos 8 caracteres.'
  if (!/[A-Z]/.test(password)) return 'A senha deve conter ao menos uma letra maiúscula.'
  if (!/[0-9]/.test(password)) return 'A senha deve conter ao menos um número.'
  return null
}

// Aberta pelo link do e-mail de recuperação. Ao salvar, o guard do layout raiz
// segue para a área logada.
export default function NewPassword() {
  const { updatePassword, signOut } = useSession()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    const invalid = validate(password)
    if (invalid) {
      setError(invalid)
      return
    }
    setLoading(true)
    setError(null)
    const message = await updatePassword(password)
    setLoading(false)
    if (message) setError(message)
  }

  return (
    <AuthShell
      title="Criar senha nova"
      subtitle="Ela substitui a senha anterior."
      error={error}
      footer={
        <Pressable testID="new-password-cancel" accessibilityRole="button" onPress={signOut} hitSlop={8}>
          <Text style={authStyles.footerLink}>Cancelar e sair</Text>
        </Pressable>
      }>
      <Field
        testID="new-password"
        label="Senha nova"
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

      <Button testID="submit" label="Salvar senha" onPress={handleSubmit} loading={loading} />
    </AuthShell>
  )
}
