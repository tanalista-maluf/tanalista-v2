import { router, Stack } from 'expo-router'
import { Globe, Lock } from 'lucide-react-native'
import { useState, type ReactNode } from 'react'
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Field, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { createGroup, type GroupInput } from '@/lib/api'
import { useHeaderInset } from '@/lib/header'
import { colors, fonts, radius } from '@/lib/theme'

// Mesma lista do site (src/features/grupos/constants.ts)
const CATEGORIES = [
  'Esportes',
  'Gastronomia',
  'Viagens',
  'Música',
  'Cinema',
  'Teatro',
  'Arte',
  'Tecnologia',
  'Negócios',
  'Saúde',
  'Educação',
  'Outros',
]

// Mesmas regras do site (src/features/grupos/schemas.ts); o servidor confere de novo
function validate(data: GroupInput): string | null {
  if (data.name.length < 3) return 'O nome precisa de ao menos 3 caracteres.'
  if (data.name.length > 80) return 'O nome pode ter no máximo 80 caracteres.'
  if (data.description.length > 500) return 'A descrição pode ter no máximo 500 caracteres.'
  if (data.city.length < 2) return 'Informe a cidade.'
  return null
}

export default function NewGroupScreen() {
  const { profile } = useSession()
  const insets = useSafeAreaInsets()
  const headerInset = useHeaderInset()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState(profile?.city ?? '')
  const [category, setCategory] = useState('')
  const [visibility, setVisibility] = useState<GroupInput['visibility']>('PUBLIC')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    const data = { name: name.trim(), description: description.trim(), city: city.trim(), category, visibility }
    const invalid = validate(data)
    if (invalid) {
      setError(invalid)
      return
    }
    setSaving(true)
    setError(null)
    const result = await createGroup(data)
    if ('error' in result) {
      setSaving(false)
      setError(result.error)
      return
    }
    // replace: voltar da página do grupo cai na lista, não neste formulário
    router.replace({ pathname: '/groups/[id]', params: { id: result.groupId } })
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Criar grupo' }} />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: 20 + headerInset }]}>
          <Field
            testID="group-name-input"
            label="Nome do grupo"
            placeholder="Ex.: Pelada de quinta"
            value={name}
            onChangeText={setName}
            maxLength={80}
          />
          <Field
            testID="group-city-input"
            label="Cidade"
            placeholder="Sua cidade"
            autoCapitalize="words"
            value={city}
            onChangeText={setCity}
            maxLength={100}
          />
          <Field
            testID="group-description-input"
            label="Descrição (opcional)"
            placeholder="Para quem é o grupo e o que vocês fazem"
            value={description}
            onChangeText={setDescription}
            maxLength={500}
            multiline
            style={styles.multiline}
          />

          <View style={styles.block}>
            <Text style={styles.label}>Categoria (opcional)</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((item) => {
                const selected = item === category
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setCategory(selected ? '' : item)}
                    style={[styles.chip, selected && styles.chipSelected]}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item}</Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>Quem pode entrar</Text>
            <VisibilityOption
              testID="group-public"
              selected={visibility === 'PUBLIC'}
              onPress={() => setVisibility('PUBLIC')}
              icon={<Globe size={20} color={visibility === 'PUBLIC' ? colors.primary : colors.text50} />}
              title="Público"
              detail="Aparece na busca e qualquer pessoa entra"
            />
            <VisibilityOption
              testID="group-private"
              selected={visibility === 'PRIVATE'}
              onPress={() => setVisibility('PRIVATE')}
              icon={<Lock size={20} color={visibility === 'PRIVATE' ? colors.primary : colors.text50} />}
              title="Privado"
              detail="Só entra quem recebe o seu link de convite"
            />
          </View>

          {error && (
            <Text testID="group-form-error" style={styles.error}>
              {error}
            </Text>
          )}
        </ScrollView>

        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button testID="group-submit" label="Criar grupo" onPress={handleSubmit} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

function VisibilityOption(props: {
  testID: string
  selected: boolean
  onPress: () => void
  icon: ReactNode
  title: string
  detail: string
}) {
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="radio"
      accessibilityState={{ selected: props.selected }}
      accessibilityLabel={`${props.title}. ${props.detail}`}
      onPress={props.onPress}
      style={[styles.option, props.selected && styles.optionSelected]}>
      {props.icon}
      <View style={styles.optionBody}>
        <Text style={styles.optionTitle}>{props.title}</Text>
        <Text style={styles.optionDetail}>{props.detail}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 18, paddingBottom: 24 },
  multiline: { height: 110, paddingTop: 14, textAlignVertical: 'top', borderRadius: radius.card },
  block: { gap: 10 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.text40 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  chipSelected: { borderColor: 'rgba(74,222,128,0.45)', backgroundColor: 'rgba(74,222,128,0.1)' },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text70 },
  chipTextSelected: { color: colors.primary },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  optionSelected: { borderColor: 'rgba(74,222,128,0.45)', backgroundColor: 'rgba(74,222,128,0.06)' },
  optionBody: { flex: 1, gap: 2 },
  optionTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  optionDetail: { fontFamily: fonts.body, fontSize: 13, color: colors.text50 },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.destructive, textAlign: 'center' },
  bar: {
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
})
