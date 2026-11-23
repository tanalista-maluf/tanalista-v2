import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { AuthShell, authStyles } from '@/components/auth-shell'
import { Button, Field } from '@/components/ui'
import { useSession } from '@/ctx'
import { completeOnboarding, runAction, type OnboardingField } from '@/lib/api'
import { colors, fonts, radius } from '@/lib/theme'

const TOTAL_STEPS = 3

// Mesma lista do site (src/app/(app)/onboarding/page.tsx)
const CATEGORIES = [
  { label: 'Esportes', emoji: '⚽' },
  { label: 'Gastronomia', emoji: '🍖' },
  { label: 'Tecnologia', emoji: '💻' },
  { label: 'Música', emoji: '🎵' },
  { label: 'Arte & Cultura', emoji: '🎨' },
  { label: 'Social', emoji: '🎉' },
  { label: 'Saúde', emoji: '🧘' },
  { label: 'Negócios', emoji: '💼' },
  { label: 'Viagens', emoji: '✈️' },
]

type Group = { id: string; name: string; category: string | null; city: string | null; member_count: number }

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

function Progress({ step }: { step: number }) {
  return (
    <View style={styles.progress}>
      <Text style={styles.progressLabel}>Etapa {step} de {TOTAL_STEPS}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((step - 1) / TOTAL_STEPS) * 100}%` }]} />
      </View>
    </View>
  )
}

// Quem acabou de criar a conta completa o perfil antes de entrar na área logada.
// 3 etapas, como no site (lá são 4: @username e cidade/WhatsApp ficam juntos aqui).
export default function Onboarding() {
  const { profile, refreshProfile, signOut } = useSession()
  const [step, setStep] = useState(1)

  // Etapa 1
  const [username, setUsername] = useState('')
  const [city, setCity] = useState(profile?.city ?? '')
  const [phone, setPhone] = useState('')
  const [fieldErr, setFieldErr] = useState<{ field?: OnboardingField; message: string } | null>(null)
  const [savingStep1, setSavingStep1] = useState(false)

  // Etapa 2
  const [interests, setInterests] = useState<string[]>([])

  // Etapa 3
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [joined, setJoined] = useState<Set<string>>(new Set())
  const [joining, setJoining] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [finishError, setFinishError] = useState<string | null>(null)

  useEffect(() => {
    if (step !== 3 || groups !== null) return
    runAction<Group[]>('suggestedGroups', city, interests).then((result) => {
      setGroups('ok' in result ? result.ok : [])
    })
  }, [step, groups, city, interests])

  async function handleStep1() {
    const data = { username: username.trim(), city: city.trim(), phone: phone.replace(/\D/g, '') }
    const invalid = validate(data.username, data.city, data.phone)
    if (invalid) {
      setFieldErr(invalid)
      return
    }
    setSavingStep1(true)
    setFieldErr(null)
    const result = await completeOnboarding(data)
    setSavingStep1(false)
    if ('error' in result) {
      setFieldErr({ field: 'field' in result ? result.field : undefined, message: result.error })
      return
    }
    setCity(data.city)
    setStep(2)
  }

  function toggleInterest(label: string) {
    setInterests((current) => (current.includes(label) ? current.filter((c) => c !== label) : [...current, label]))
    // Interesses mudaram: a etapa 3 precisa buscar os grupos sugeridos de novo
    setGroups(null)
  }

  function handleJoin(groupId: string) {
    setJoining(groupId)
    runAction('joinOnboardingGroup', groupId).then(() => {
      setJoined((current) => new Set([...current, groupId]))
      setJoining(null)
    })
  }

  async function handleFinish() {
    setFinishing(true)
    setFinishError(null)
    const result = await runAction('finishOnboarding')
    if ('error' in result) {
      setFinishError(result.error)
      setFinishing(false)
      return
    }
    // Com o perfil completo, o guard do layout raiz abre a área logada
    await refreshProfile()
    setFinishing(false)
  }

  const fieldError = (field: OnboardingField) =>
    fieldErr?.field === field ? (
      <Text testID={`${field}-error`} style={authStyles.fieldError}>
        {fieldErr.message}
      </Text>
    ) : null

  if (step === 1) {
    return (
      <AuthShell
        title="Complete seu perfil"
        subtitle={profile ? `Olá, ${profile.full_name.split(' ')[0]}! Falta pouco.` : 'Falta pouco.'}
        error={fieldErr && !fieldErr.field ? fieldErr.message : null}
        footer={
          <Pressable testID="onboarding-sign-out" onPress={signOut} hitSlop={8}>
            <Text style={authStyles.footerText}>Sair</Text>
          </Pressable>
        }>
        <Progress step={1} />
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
          label="Telefone"
          placeholder="11999998888"
          keyboardType="number-pad"
          textContentType="telephoneNumber"
          maxLength={15}
          value={phone}
          onChangeText={setPhone}
        />
        {fieldError('phone') ?? <Text style={authStyles.hint}>Os organizadores usam para falar com você sobre o evento.</Text>}
        {/* Por último: o teclado numérico do telefone não tem tecla de concluir */}
        <Field
          testID="city"
          label="Cidade"
          placeholder="São Paulo"
          autoCapitalize="words"
          textContentType="addressCity"
          value={city}
          onChangeText={setCity}
          returnKeyType="done"
          onSubmitEditing={handleStep1}
        />
        {fieldError('city')}

        <Button testID="submit" label="Continuar" onPress={handleStep1} loading={savingStep1} />
      </AuthShell>
    )
  }

  if (step === 2) {
    return (
      <AuthShell
        title="O que você curte?"
        subtitle="Selecione seus interesses para encontrar grupos certos pra você."
        footer={
          <Pressable testID="onboarding-sign-out" onPress={signOut} hitSlop={8}>
            <Text style={authStyles.footerText}>Sair</Text>
          </Pressable>
        }>
        <Progress step={2} />
        <View style={styles.chips}>
          {CATEGORIES.map(({ label, emoji }) => {
            const active = interests.includes(label)
            return (
              <Pressable
                key={label}
                testID={`interest-${label}`}
                onPress={() => toggleInterest(label)}
                style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {emoji} {label}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <View style={styles.row}>
          <Button label="Voltar" onPress={() => setStep(1)} style={styles.flex} />
          <Button
            testID="interests-next"
            label={interests.length > 0 ? `Continuar (${interests.length})` : 'Pular'}
            onPress={() => setStep(3)}
            style={styles.flex}
          />
        </View>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Grupos para você"
      subtitle={city ? `Grupos em ${city} que combinam com seus interesses.` : 'Grupos públicos disponíveis.'}
      error={finishError}
      footer={
        <Pressable testID="onboarding-sign-out" onPress={signOut} hitSlop={8}>
          <Text style={authStyles.footerText}>Sair</Text>
        </Pressable>
      }>
      <Progress step={3} />

      {groups === null ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : groups.length === 0 ? (
        <Text style={styles.empty}>Nenhum grupo encontrado para sua cidade. Você pode explorar grupos depois.</Text>
      ) : (
        <View style={styles.groups}>
          {groups.map((group) => {
            const isJoined = joined.has(group.id)
            return (
              <View key={group.id} style={styles.groupRow}>
                <View style={styles.groupAvatar}>
                  <Text style={styles.groupAvatarText}>{group.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMeta}>
                    {group.member_count} membros{group.category ? ` · ${group.category}` : ''}
                  </Text>
                </View>
                <Pressable
                  testID={`join-${group.id}`}
                  onPress={() => !isJoined && handleJoin(group.id)}
                  disabled={joining === group.id || isJoined}
                  style={[styles.joinButton, isJoined && styles.joinButtonDone]}>
                  {isJoined ? (
                    <View style={styles.joinedLabel}>
                      <Check size={12} color={colors.primary} />
                      <Text style={styles.joinedText}>Entrou</Text>
                    </View>
                  ) : (
                    <Text style={styles.joinText}>Entrar</Text>
                  )}
                </Pressable>
              </View>
            )
          })}
        </View>
      )}

      <View style={styles.row}>
        <Button label="Voltar" onPress={() => setStep(2)} style={styles.flex} />
        <Button
          testID="finish-onboarding"
          label={joined.size > 0 ? 'Entrar no app' : 'Pular e entrar'}
          onPress={handleFinish}
          loading={finishing}
          style={styles.flex}
        />
      </View>
    </AuthShell>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 10 },
  progress: { gap: 6, marginBottom: -6 },
  progressLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.text40 },
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: colors.track, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: 'rgba(74,222,128,0.12)' },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text70 },
  chipTextActive: { color: colors.primary },
  loading: { paddingVertical: 24 },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.text40, textAlign: 'center', paddingVertical: 20 },
  groups: { gap: 8 },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 12,
  },
  groupAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatarText: { fontFamily: fonts.heading, fontSize: 16, color: colors.primary },
  groupName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.foreground },
  groupMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.text35, marginTop: 2 },
  joinButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: colors.primary },
  joinButtonDone: {
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
  },
  joinText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.primaryForeground },
  joinedLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  joinedText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.primary },
})
