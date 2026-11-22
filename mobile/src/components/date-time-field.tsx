import { DateTimePicker } from '@expo/ui/community/datetime-picker'
import { DatePicker, Host } from '@expo/ui/swift-ui'
import { datePickerStyle, environment, frame, labelsHidden, tint } from '@expo/ui/swift-ui/modifiers'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fonts, radius } from '@/lib/theme'

function format(date: Date) {
  const day = date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${day} às ${time}`
}

type Props = {
  label: string
  value: Date | null
  onChange: (value: Date | null) => void
  testID?: string
  // Campo opcional: pode ficar vazio (ex.: término do evento)
  optional?: boolean
}

// Data e hora num campo só. No iOS o seletor compacto do sistema fica dentro
// do campo, à esquerda; no Android o toque abre o calendário e depois
// o relógio.
export function DateTimeField({ label, value, onChange, testID, optional }: Props) {
  const [step, setStep] = useState<'date' | 'time' | null>(null)
  const current = value ?? new Date()

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {process.env.EXPO_OS === 'ios' && value ? (
        <View style={styles.row}>
          {/* O seletor ocupa o campo todo e se alinha à esquerda, centrado na
              altura: sem o frame do SwiftUI ele vai para o canto e sai da tela */}
          <View style={[styles.input, styles.pickerBox]}>
            <Host style={styles.pickerHost}>
              <DatePicker
                testID={testID}
                selection={value}
                displayedComponents={['date', 'hourAndMinute']}
                onDateChange={onChange}
                modifiers={[
                  datePickerStyle('compact'),
                  labelsHidden(),
                  frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'leading' }),
                  tint(colors.primary),
                  environment('locale', 'pt_BR'),
                  environment('colorScheme', 'dark'),
                ]}
              />
            </Host>
          </View>
          {optional && (
            <Pressable accessibilityRole="button" onPress={() => onChange(null)} hitSlop={8}>
              <Text style={styles.clear}>Remover</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.row}>
          <Pressable
            testID={testID}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${value ? format(value) : 'não definido'}`}
            onPress={() => {
              if (!value) onChange(current)
              if (process.env.EXPO_OS !== 'ios') setStep('date')
            }}
            style={styles.input}>
            <Text style={value ? styles.value : styles.placeholder}>{value ? format(value) : 'Definir'}</Text>
          </Pressable>
          {optional && value && (
            <Pressable accessibilityRole="button" onPress={() => onChange(null)} hitSlop={8}>
              <Text style={styles.clear}>Remover</Text>
            </Pressable>
          )}
        </View>
      )}
      {step === 'date' && (
        <DateTimePicker
          value={current}
          mode="date"
          accentColor={colors.primary}
          onValueChange={(_, date) => {
            const next = new Date(current)
            next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate())
            onChange(next)
            setStep('time')
          }}
          onDismiss={() => setStep(null)}
        />
      )}
      {step === 'time' && (
        <DateTimePicker
          value={current}
          mode="time"
          is24Hour
          accentColor={colors.primary}
          onValueChange={(_, date) => {
            const next = new Date(current)
            next.setHours(date.getHours(), date.getMinutes(), 0, 0)
            onChange(next)
            setStep(null)
          }}
          onDismiss={() => setStep(null)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: {
    flex: 1,
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  // Alinhado à esquerda, como o "Definir" dos campos vazios
  pickerBox: { height: 50 },
  pickerHost: { position: 'absolute', top: 0, bottom: 0, left: 6, right: 10 },
  value: { fontFamily: fonts.body, fontSize: 15, color: colors.foreground },
  placeholder: { fontFamily: fonts.body, fontSize: 15, color: colors.text35 },
  clear: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text50 },
})
