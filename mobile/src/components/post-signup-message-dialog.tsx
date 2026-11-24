import { Image } from 'expo-image'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button } from '@/components/ui'
import { colors, fonts, radius } from '@/lib/theme'

type Props = {
  visible: boolean
  message: string | null
  imageUrl: string | null
  onClose: () => void
}

// Mostrado uma vez, assim que a inscrição é confirmada (evento gratuito ou
// pagamento aprovado) — texto e/ou imagem que o organizador escolhe na
// edição do evento: regras, como chegar, avisos etc. Igual ao popup do site.
export function PostSignupMessageDialog({ visible, message, imageUrl, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={styles.box} testID="post-signup-message-dialog">
          {imageUrl && <Image source={imageUrl} style={styles.image} contentFit="cover" />}
          <Text style={styles.title}>Inscrição confirmada!</Text>
          {message && (
            <ScrollView style={styles.scroll}>
              <Text style={styles.message}>{message}</Text>
            </ScrollView>
          )}
          <Button testID="post-signup-message-close" label="Entendi" onPress={onClose} />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.6)' },
  box: {
    gap: 14,
    padding: 20,
    maxHeight: '70%',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.surface,
  },
  image: { width: '100%', height: 150, borderRadius: 12, backgroundColor: colors.input },
  title: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  scroll: { flexGrow: 0 },
  message: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text70 },
})
