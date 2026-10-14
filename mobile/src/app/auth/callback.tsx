import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text } from 'react-native'
import { Button, Screen } from '@/components/ui'
import { exchangeAuthCode } from '@/ctx'
import { colors, fonts } from '@/lib/theme'

// Chegada de tanalista://auth/callback como link: o e-mail de recuperação de
// senha e, no Android, também o retorno do login com Google (que ctx.tsx já
// trata por ter aberto o navegador; a troca do código não se repete).
export default function AuthCallback() {
  const { code, error } = useLocalSearchParams<{ code?: string; error?: string }>()
  const [result, setResult] = useState<{ ok: boolean; recovery: boolean } | null>(null)

  useEffect(() => {
    if (code) exchangeAuthCode(code).then(setResult)
  }, [code])

  // Link vencido, já usado, ou pedido em outro aparelho
  if (error || result?.ok === false) {
    return (
      <Screen style={styles.screen}>
        <Text testID="callback-error" style={styles.text}>
          Este link não vale mais. Peça um novo e abra neste mesmo aparelho.
        </Text>
        <Button label="Voltar" onPress={() => router.replace('/')} />
      </Screen>
    )
  }

  if (code && !result) {
    return (
      <Screen style={styles.screen}>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    )
  }

  return <Redirect href={result?.recovery ? '/new-password' : '/'} />
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center', padding: 24, gap: 20 },
  text: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.foreground, textAlign: 'center' },
})
