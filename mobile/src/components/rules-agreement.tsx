import { Check } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fonts } from '@/lib/theme'

// Checkbox "Li e concordo com as diretrizes" mostrado antes dos botões de
// inscrição/fila quando o organizador exige confirmação de leitura das
// regras (events.rules_confirmation_required). "diretrizes" é um link que
// leva pra aba Regras — igual ao `?aba=regras` do site.
export function RulesAgreement({
  checked,
  onToggle,
  onViewRules,
}: {
  checked: boolean
  onToggle: () => void
  onViewRules: () => void
}) {
  return (
    <Pressable
      testID="rules-agreement"
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={styles.row}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
      </View>
      <Text style={styles.text}>
        Li e concordo com{' '}
        <Text testID="rules-agreement-link" onPress={onViewRules} style={styles.link}>
          as diretrizes
        </Text>{' '}
        do evento
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.text25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { borderColor: colors.primary, backgroundColor: colors.primary },
  text: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.text50 },
  link: { color: colors.primary, textDecorationLine: 'underline' },
})
