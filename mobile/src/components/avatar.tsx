import { Image } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'
import { colors, fonts } from '@/lib/theme'

// Foto da pessoa, ou as iniciais do nome quando não há foto
export function Avatar({ name, url, size }: { name: string; url?: string | null; size: number }) {
  const shape = { width: size, height: size, borderRadius: size / 2 }
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  return (
    <View style={[styles.avatar, shape]}>
      {url ? (
        <Image source={url} style={shape} contentFit="cover" />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials || '?'}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
  },
  initials: { fontFamily: fonts.bodyBold, color: colors.primary },
})
