import { useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { colors, fonts, radius } from '@/lib/theme'

// A palavra que libera o cancelamento, como no site (OrganizerActions)
const CONFIRM_WORD = 'CANCELAR'

type Props = {
  visible: boolean
  title: string
  // Inscritos confirmados que serão avisados
  confirmedCount: number
  // Texto do valor que volta para a carteira (ex.: "R$ 120,00"), ou null se ninguém pagou
  refundLabel: string | null
  onClose: () => void
  onConfirm: () => void
}

// Confirmação reforçada do cancelamento do evento: mostra quem é afetado e só
// libera o botão depois de digitar CANCELAR, para ninguém cancelar por engano
export function CancelEventDialog({ visible, title, confirmedCount, refundLabel, onClose, onConfirm }: Props) {
  const [typed, setTyped] = useState('')
  const ready = typed.trim().toUpperCase() === CONFIRM_WORD

  function close() {
    setTyped('')
    onClose()
  }

  function confirm() {
    if (!ready) return
    setTyped('')
    onConfirm()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Fechar" />
        <View style={styles.box} testID="cancel-dialog">
          <Text style={styles.title}>Cancelar o evento?</Text>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.facts}>
            <Text style={styles.fact}>
              {confirmedCount === 0
                ? '• Ninguém está inscrito ainda.'
                : `• ${confirmedCount} ${confirmedCount === 1 ? 'inscrito será avisado' : 'inscritos serão avisados'}.`}
            </Text>
            {refundLabel && <Text style={styles.fact}>• {refundLabel} voltam como crédito na carteira de quem pagou.</Text>}
            <Text style={[styles.fact, styles.warn]}>• Não dá para desfazer.</Text>
          </View>
          <Text style={styles.label}>
            Para confirmar, digite <Text style={styles.word}>{CONFIRM_WORD}</Text>
          </Text>
          <TextInput
            testID="cancel-dialog-input"
            value={typed}
            onChangeText={setTyped}
            placeholder={CONFIRM_WORD}
            placeholderTextColor={colors.text25}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="done"
            onSubmitEditing={confirm}
            style={styles.input}
          />
          <View style={styles.actions}>
            <Pressable testID="cancel-dialog-back" accessibilityRole="button" onPress={close} style={[styles.button, styles.back]}>
              <Text style={styles.backText}>Voltar</Text>
            </Pressable>
            <Pressable
              testID="cancel-dialog-confirm"
              accessibilityRole="button"
              accessibilityState={{ disabled: !ready }}
              disabled={!ready}
              onPress={confirm}
              style={[styles.button, styles.confirm, !ready && styles.dim]}>
              <Text style={styles.confirmText}>Cancelar evento</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.6)' },
  box: {
    gap: 12,
    padding: 20,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.surface,
  },
  title: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  eventTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text70 },
  facts: { gap: 4 },
  fact: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text50 },
  warn: { color: colors.destructive },
  label: { fontFamily: fonts.body, fontSize: 13, color: colors.text50, marginTop: 4 },
  word: { fontFamily: fonts.bodyBold, color: colors.text },
  input: {
    minHeight: 46,
    paddingHorizontal: 14,
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    letterSpacing: 1,
    color: colors.foreground,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  button: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  back: { borderWidth: 1, borderColor: colors.border },
  backText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text70 },
  confirm: { backgroundColor: colors.destructive },
  confirmText: { fontFamily: fonts.bodySemi, fontSize: 15, color: '#FFFFFF' },
  dim: { opacity: 0.35 },
})
