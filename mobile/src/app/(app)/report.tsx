import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Screen } from '@/components/ui'
import { submitReport, type ReportReason } from '@/lib/api'
import { useHeaderInset } from '@/lib/header'
import { colors, fonts, radius } from '@/lib/theme'

// Mesmos motivos do site (src/features/reports/components/ReportButton.tsx)
const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'SPAM', label: 'Spam ou propaganda' },
  { value: 'INAPPROPRIATE', label: 'Conteúdo inapropriado' },
  { value: 'FAKE', label: 'Informação falsa ou enganosa' },
  { value: 'DANGEROUS', label: 'Conteúdo perigoso' },
  { value: 'OTHER', label: 'Outro motivo' },
]

// Denúncia de um evento ou de um grupo; quem recebe é a equipe do TáNaLista
export default function ReportScreen() {
  const { type, id, name } = useLocalSearchParams<{ type: 'EVENT' | 'GROUP'; id: string; name?: string }>()
  const insets = useSafeAreaInsets()
  const headerInset = useHeaderInset()
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit() {
    if (!reason) {
      setError('Escolha o motivo da denúncia.')
      return
    }
    setSaving(true)
    setError(null)
    const result = await submitReport({ type: type === 'GROUP' ? 'GROUP' : 'EVENT', id }, reason, description)
    setSaving(false)
    if ('error' in result) setError(result.error)
    else setSent(true)
  }

  const header = <Stack.Screen options={{ title: type === 'GROUP' ? 'Denunciar grupo' : 'Denunciar evento' }} />

  if (sent) {
    return (
      <Screen style={styles.sent}>
        {header}
        <Text testID="report-sent" style={styles.sentText}>
          Denúncia enviada. Nossa equipe vai analisar. Obrigado por avisar.
        </Text>
        <Button testID="report-done" label="Voltar" onPress={() => router.back()} />
      </Screen>
    )
  }

  return (
    <Screen>
      {header}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: 20 + headerInset }]}>
          {name ? <Text style={styles.target}>{name}</Text> : null}
          <Text style={styles.label}>Motivo</Text>
          {REASONS.map((item, index) => {
            const selected = item.value === reason
            return (
              <Pressable
                key={item.value}
                testID={`report-reason-${index}`}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setReason(item.value)}
                style={[styles.option, selected && styles.optionSelected]}>
                <Text style={styles.optionText}>{item.label}</Text>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            )
          })}
          <Text style={styles.label}>Detalhes (opcional)</Text>
          <TextInput
            testID="report-description"
            value={description}
            onChangeText={setDescription}
            placeholder="Conte o que aconteceu"
            placeholderTextColor={colors.text35}
            selectionColor={colors.primary}
            maxLength={1000}
            multiline
            style={styles.input}
          />
        </ScrollView>
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {/* Junto do botão: no fim do formulário, o teclado escondia o erro */}
          {error && (
            <Text testID="report-error" style={styles.error}>
              {error}
            </Text>
          )}
          <Button testID="report-submit" label="Enviar denúncia" onPress={handleSubmit} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sent: { justifyContent: 'center', padding: 24, gap: 20 },
  sentText: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.foreground, textAlign: 'center' },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  target: { fontFamily: fonts.headingBlack, fontSize: 20, lineHeight: 26, color: colors.text, marginBottom: 4 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.text40, marginTop: 6 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  optionSelected: { borderColor: 'rgba(74,222,128,0.45)', backgroundColor: 'rgba(74,222,128,0.06)' },
  optionText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.text25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  input: {
    minHeight: 110,
    padding: 14,
    textAlignVertical: 'top',
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.foreground,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
  },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.destructive, textAlign: 'center' },
  bar: {
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
})
