import { CameraView, useCameraPermissions } from 'expo-camera'
import { Stack, useLocalSearchParams } from 'expo-router'
import { CheckCircle2, XCircle } from 'lucide-react-native'
import { useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Button, Screen } from '@/components/ui'
import { runAction } from '@/lib/api'
import { colors, fonts } from '@/lib/theme'

// Mesmo formato do QR code do ingresso (site e app)
const PREFIX = 'tanalista:checkin:'

type Scan = { ok: boolean; title: string; detail?: string }

// Leitor de ingressos do organizador: cada QR lido faz o check-in na hora
export default function ScanScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>()
  const [permission, requestPermission] = useCameraPermissions()
  const [last, setLast] = useState<Scan | null>(null)
  // Evita ler o mesmo código várias vezes enquanto ele está na frente da câmera
  const handling = useRef(false)
  const lastCode = useRef<string | null>(null)

  async function handle(code: string) {
    if (handling.current || code === lastCode.current) return
    handling.current = true
    lastCode.current = code

    if (!code.startsWith(PREFIX)) {
      setLast({ ok: false, title: 'QR code inválido', detail: 'Este código não é um ingresso do TáNaLista.' })
    } else {
      const result = await runAction<{ success: boolean; alreadyCheckedIn?: boolean; name?: string; error?: string }>(
        'checkIn',
        eventId,
        code.slice(PREFIX.length)
      )
      if ('ok' in result && result.ok.success) {
        setLast({
          ok: true,
          title: result.ok.alreadyCheckedIn ? 'Check-in já feito' : 'Check-in feito!',
          detail: result.ok.name,
        })
      } else {
        setLast({
          ok: false,
          title: 'Não foi possível',
          detail: 'error' in result ? result.error : (result as { ok?: { error?: string } }).ok?.error,
        })
      }
    }
    handling.current = false
  }

  const header = <Stack.Screen options={{ title: 'Check-in' }} />

  if (!permission) return <Screen>{header}</Screen>

  if (!permission.granted) {
    return (
      <Screen style={styles.center}>
        {header}
        <Text style={styles.text}>Para ler os ingressos, o app precisa usar a câmera.</Text>
        <Button testID="scan-permission" label="Permitir câmera" onPress={requestPermission} />
      </Screen>
    )
  }

  return (
    <Screen>
      {header}
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => handle(data)}
      />
      <View style={styles.panel}>
        {last ? (
          <View testID="scan-result" style={styles.result}>
            {last.ok ? <CheckCircle2 size={30} color={colors.primary} /> : <XCircle size={30} color={colors.destructive} />}
            <View style={styles.resultBody}>
              <Text style={[styles.resultTitle, !last.ok && styles.resultError]}>{last.title}</Text>
              {last.detail ? <Text style={styles.text}>{last.detail}</Text> : null}
            </View>
          </View>
        ) : (
          <Text style={styles.text}>Aponte a câmera para o QR code do ingresso.</Text>
        )}
        {last && (
          <Button
            label="Ler outro"
            onPress={() => {
              lastCode.current = null
              setLast(null)
            }}
          />
        )}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', padding: 24, gap: 18 },
  camera: { flex: 1 },
  panel: { padding: 18, gap: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  result: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  resultBody: { flex: 1, gap: 2 },
  resultTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.primary },
  resultError: { color: colors.destructive },
  text: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.text70, textAlign: 'center' },
})
