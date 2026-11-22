import * as Clipboard from 'expo-clipboard'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { CheckCheck, Clock, Copy } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button, Card, Screen } from '@/components/ui'
import { createPixPayment, type PixPayment } from '@/lib/api'
import { formatPrice } from '@/lib/format'
import { useHeaderInset } from '@/lib/header'
import { supabase } from '@/lib/supabase'
import { colors, fonts, radius } from '@/lib/theme'

const POLL_INTERVAL = 3000

type Summary = { title: string; amount: number }

// O valor cobrado é o preço do evento menos o desconto de cupom da inscrição
async function fetchSummary(participationId: string): Promise<Summary | null> {
  const { data } = await supabase
    .from('participations')
    .select('discount_cents, events(title, price)')
    .eq('id', participationId)
    .maybeSingle()

  const event = data?.events as unknown as { title: string; price: number } | null
  if (!data || !event) return null
  return { title: event.title, amount: Math.max(0, event.price - (data.discount_cents ?? 0)) }
}

export default function PaymentScreen() {
  const { participationId } = useLocalSearchParams<{ participationId: string }>()
  const headerInset = useHeaderInset()

  const [summary, setSummary] = useState<Summary | null>(null)
  const [pix, setPix] = useState<PixPayment | null>(null)
  const [error, setError] = useState<string | null>(null)
  // WAITING enquanto o pagamento não chega; o servidor cancela a inscrição se o PIX expira
  const [status, setStatus] = useState<'WAITING' | 'CONFIRMED' | 'CANCELLED'>('WAITING')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    fetchSummary(participationId).then((result) => active && setSummary(result))
    createPixPayment(participationId).then((result) => {
      if (!active) return
      if ('error' in result) setError(result.error)
      else setPix(result)
    })
    return () => {
      active = false
    }
  }, [participationId])

  // Espera a confirmação: o webhook do Mercado Pago confirma a inscrição no servidor
  useEffect(() => {
    if (!pix || status !== 'WAITING') return

    const timer = setInterval(async () => {
      const { data } = await supabase.from('participations').select('status').eq('id', participationId).maybeSingle()
      if (data?.status === 'CONFIRMED' || data?.status === 'CANCELLED') setStatus(data.status)
    }, POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [pix, status, participationId])

  async function copyCode() {
    if (!pix?.qr_code) return
    await Clipboard.setStringAsync(pix.qr_code)
    setCopied(true)
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Pagamento via PIX' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingTop: 24 + headerInset }]}>
        {summary && (
          <View style={styles.summary}>
            <Text style={styles.title}>{summary.title}</Text>
            <Text style={styles.amount}>{formatPrice(summary.amount)}</Text>
          </View>
        )}

        {error ? (
          <View style={styles.state}>
            <Text testID="payment-error" style={styles.error}>
              {error}
            </Text>
            <Button label="Voltar ao evento" onPress={() => router.back()} />
          </View>
        ) : status === 'CONFIRMED' ? (
          <View testID="payment-confirmed" style={styles.state}>
            <View style={styles.stateIcon}>
              <CheckCheck size={32} color={colors.primary} />
            </View>
            <Text style={styles.confirmedText}>Pagamento confirmado!</Text>
            <Text style={styles.hint}>Sua vaga está garantida.</Text>
            <Button testID="payment-done" label="Ver evento" onPress={() => router.back()} style={styles.wide} />
          </View>
        ) : status === 'CANCELLED' ? (
          <View testID="payment-expired" style={styles.state}>
            <Clock size={44} color={colors.destructive} />
            <Text style={styles.stateTitle}>Tempo expirado</Text>
            <Text style={styles.hint}>O código PIX expirou e a inscrição foi cancelada. Você pode se inscrever de novo.</Text>
            <Button label="Voltar ao evento" onPress={() => router.back()} style={styles.wide} />
          </View>
        ) : !pix ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.hint}>Gerando PIX...</Text>
          </View>
        ) : (
          <>
            <Card style={styles.codeCard}>
              <Text style={styles.label}>PIX Copia e Cola</Text>
              <Text testID="pix-code" style={styles.code} numberOfLines={3} selectable>
                {pix.qr_code}
              </Text>
              <Button
                testID="copy-pix"
                label={copied ? 'Código copiado' : 'Copiar código'}
                icon={
                  copied ? (
                    <CheckCheck size={18} color={colors.primaryForeground} />
                  ) : (
                    <Copy size={18} color={colors.primaryForeground} />
                  )
                }
                onPress={copyCode}
              />
            </Card>

            <Card style={styles.steps}>
              <Step number="1" text="Copie o código acima" />
              <Step number="2" text="Abra o app do seu banco e entre na área PIX" />
              <Step number="3" text="Escolha PIX Copia e Cola, cole o código e confirme" />
              <Step number="4" text="Volte para cá: a confirmação aparece sozinha" />
            </Card>

            {pix.qr_code_base64 ? (
              <View style={styles.qrBlock}>
                <Text style={styles.hint}>Pagando de outro aparelho? Leia o QR Code:</Text>
                <View style={styles.qr}>
                  <Image
                    source={{ uri: `data:image/png;base64,${pix.qr_code_base64}` }}
                    style={styles.qrImage}
                    accessibilityLabel="QR Code PIX"
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.waiting}>
              <ActivityIndicator color={colors.text40} size="small" />
              <Text style={styles.hint}>Aguardando confirmação do pagamento...</Text>
            </View>
            <Text style={styles.later}>
              O código vale por 30 minutos. Se sair desta tela, volte pelo botão Pagar na página do evento.
            </Text>
          </>
        )}
      </ScrollView>
    </Screen>
  )
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  summary: { alignItems: 'center', gap: 4 },
  title: { fontFamily: fonts.body, fontSize: 15, color: colors.text50, textAlign: 'center' },
  amount: { fontFamily: fonts.headingBlack, fontSize: 34, color: colors.primary, letterSpacing: -0.5 },
  state: { alignItems: 'center', gap: 14, paddingVertical: 40, paddingHorizontal: 12 },
  stateIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(74,222,128,0.1)',
  },
  stateTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.foreground },
  confirmedText: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.primary },
  wide: { alignSelf: 'stretch', marginTop: 8 },
  error: { fontFamily: fonts.body, fontSize: 15, color: colors.destructive, textAlign: 'center' },
  hint: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },
  codeCard: { padding: 18, gap: 12 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.text40 },
  code: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text70,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    overflow: 'hidden',
  },
  steps: { padding: 18, gap: 14 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(74,222,128,0.1)',
  },
  stepNumberText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
  stepText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.foreground },
  qrBlock: { alignItems: 'center', gap: 12 },
  qr: { backgroundColor: '#FFFFFF', borderRadius: radius.card, padding: 12 },
  qrImage: { width: 200, height: 200 },
  waiting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  later: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.text35, textAlign: 'center' },
})
