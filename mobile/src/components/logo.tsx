import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { colors, fonts } from '@/lib/theme'

// Mesmo desenho de public/favicon.svg e do cabeçalho do site
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <Rect width="56" height="56" rx="14" fill={colors.primary} fillOpacity={0.09} />
      <Rect x="16" y="18" width="20" height="2.5" rx="1.25" fill={colors.primary} />
      <Rect x="16" y="24.5" width="14" height="2.5" rx="1.25" fill={colors.primary} fillOpacity={0.4} />
      <Rect x="16" y="31" width="16" height="2.5" rx="1.25" fill={colors.primary} fillOpacity={0.4} />
      <Circle cx="39" cy="36" r="9" fill={colors.primary} />
      <Path
        d="M34.5 36.2l3 3 5-5.5"
        stroke={colors.primaryForeground}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function Logo({ size = 24 }: { size?: number }) {
  return (
    <View style={styles.row} accessible accessibilityLabel="TáNaLista">
      <LogoMark size={Math.round(size * 1.35)} />
      <Text style={[styles.word, { fontSize: size }]}>
        Tá<Text style={styles.na}>na</Text>Lista
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontFamily: fonts.headingBlack, color: colors.primary, letterSpacing: -0.5 },
  na: { fontFamily: fonts.headingLight, color: colors.text40 },
})
