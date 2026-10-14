import { Image } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'
import { colors, fonts } from '@/lib/theme'

// Monograma T e L (assets/brand/monograma.png, ícones gerados por
// assets/brand/gerar-icones.py); o site usa o mesmo arquivo
// em public/logo-mark.png
export function LogoMark({ size = 32 }: { size?: number }) {
  return <Image source={require('@/assets/images/logo-mark.png')} style={{ width: size, height: size }} />
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
