import { LinearGradient } from 'expo-linear-gradient'
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { colors, fonts, radius } from '@/lib/theme'

// Fundo das telas: o brilho verde no topo que o site usa (.hero-gradient)
export function Screen({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <View style={[styles.screen, style]}>
      <LinearGradient
        colors={[colors.glow, 'rgba(26,74,46,0.35)', 'transparent']}
        locations={[0, 0.45, 1]}
        style={styles.glow}
        pointerEvents="none"
      />
      {children}
    </View>
  )
}

// .card-dark
export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>
}

type ButtonProps = {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  icon?: ReactNode
  testID?: string
  style?: StyleProp<ViewStyle>
}

export function Button({ label, onPress, loading, disabled, icon, testID, style }: ButtonProps) {
  const inactive = disabled || loading
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [styles.button, (pressed || inactive) && styles.buttonDim, style]}>
      {loading ? (
        <ActivityIndicator color={colors.primaryForeground} />
      ) : (
        <>
          {icon}
          <Text style={styles.buttonText}>{label}</Text>
        </>
      )}
    </Pressable>
  )
}

type FieldProps = ComponentProps<typeof TextInput> & {
  label: string
  // conteúdo à direita do rótulo (ex.: "Esqueceu a senha?")
  labelAction?: ReactNode
  // conteúdo dentro do campo, à direita (ex.: mostrar senha)
  trailing?: ReactNode
}

export function Field({ label, labelAction, trailing, style, ...input }: FieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {labelAction}
      </View>
      <View style={styles.inputWrap}>
        <TextInput
          placeholderTextColor={colors.text35}
          selectionColor={colors.primary}
          style={[styles.input, trailing ? styles.inputWithTrailing : null, style]}
          {...input}
        />
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
    </View>
  )
}

// Barra de ocupação: verde, amarela a partir de 80%, vermelha quando lota
export function OccupancyBar({ confirmed, capacity }: { confirmed: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min(1, confirmed / capacity) : 0
  const color = pct >= 1 ? colors.destructive : pct >= 0.8 ? colors.warning : colors.primary
  return (
    <View style={styles.track}>
      <View style={[styles.trackFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </View>
  )
}

export function Badge({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'warning' | 'danger' | 'muted' }) {
  const palette = {
    primary: { text: colors.primary, bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.18)' },
    warning: { text: colors.warning, bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.18)' },
    danger: { text: '#FFFFFF', bg: 'rgba(239,68,68,0.9)', border: 'transparent' },
    muted: { text: colors.text40, bg: 'rgba(255,255,255,0.04)', border: colors.border },
  }[tone]
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 320, opacity: 0.55 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
  },
  button: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    minHeight: 48,
    paddingHorizontal: 22,
    // .glow-primary
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  buttonDim: { opacity: 0.6 },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryForeground },
  field: { gap: 8 },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: 'rgba(74,222,128,0.7)',
  },
  inputWrap: { justifyContent: 'center' },
  input: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.foreground,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    height: 50,
  },
  inputWithTrailing: { paddingRight: 48 },
  trailing: { position: 'absolute', right: 6, height: 44, width: 40, alignItems: 'center', justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.track, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 2 },
  badge: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 13 },
})
