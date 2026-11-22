import type { PropsWithChildren, ReactNode } from 'react'
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Logo } from '@/components/logo'
import { Card, Screen } from '@/components/ui'
import { colors, fonts } from '@/lib/theme'

type AuthShellProps = PropsWithChildren<{
  title: string
  subtitle: string
  error?: string | null
  // rodapé do cartão (ex.: "Não tem conta? Criar conta grátis")
  footer?: ReactNode
}>

// Moldura das telas de fora da área logada: marca em cima, formulário num cartão
export function AuthShell({ title, subtitle, error, footer, children }: AuthShellProps) {
  return (
    <Screen>
      <SafeAreaView style={styles.flex}>
        {/* 'padding' nos dois sistemas: com a tela de ponta a ponta, o Android não
            redimensiona mais a janela sozinho e o teclado cobria o botão */}
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.brand}>
              <Logo size={26} />
              <Text style={styles.tagline}>Organize eventos com pagamento confirmado</Text>
            </View>

            <Card style={styles.card}>
              <View style={styles.cardBody}>
                <View>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.subtitle}>{subtitle}</Text>
                </View>

                {error && (
                  <View style={styles.alert}>
                    <Text testID="form-error" style={styles.alertText}>
                      {error}
                    </Text>
                  </View>
                )}

                {children}
              </View>

              {footer ? <View style={styles.cardFooter}>{footer}</View> : null}
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Screen>
  )
}

export const authStyles = StyleSheet.create({
  link: { fontFamily: fonts.body, fontSize: 13, color: colors.primary },
  footerText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  footerLink: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },
  hint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.text40, marginTop: -8 },
  fieldError: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.destructive, marginTop: -8 },
})

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 18, gap: 28 },
  brand: { alignItems: 'center', gap: 10 },
  tagline: { fontFamily: fonts.body, fontSize: 14, color: colors.text35, textAlign: 'center' },
  card: { overflow: 'hidden' },
  cardBody: { padding: 20, gap: 18 },
  title: { fontFamily: fonts.heading, fontSize: 18, color: colors.foreground },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginTop: 4 },
  alert: {
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    backgroundColor: 'rgba(248,113,113,0.05)',
    borderRadius: 12,
    padding: 12,
  },
  alertText: { fontFamily: fonts.body, fontSize: 14, color: colors.destructive },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingVertical: 16,
  },
})
