import { Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { Card, Screen } from '@/components/ui'
import { fetchNotificationPreferences, updateNotificationPreferences, type NotificationPreferences } from '@/lib/api'
import { useHeaderInset } from '@/lib/header'
import { colors, fonts, radius } from '@/lib/theme'

const CHANNELS: { value: NotificationPreferences['notif_new_event_channel']; label: string }[] = [
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'NONE', label: 'Nenhum' },
]

// Mesmas preferências da página de perfil do site, mais o push no celular
export default function NotificationSettingsScreen() {
  const headerInset = useHeaderInset()
  const [preferences, setPreferences] = useState<NotificationPreferences | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchNotificationPreferences().then((result) => {
      if (active) setPreferences('error' in result ? null : result)
    })
    return () => {
      active = false
    }
  }, [])

  // Grava na hora e volta atrás se o servidor recusar
  async function save(change: Partial<NotificationPreferences>) {
    if (!preferences) return
    const previous = preferences
    setPreferences({ ...preferences, ...change })
    setError(null)
    const result = await updateNotificationPreferences(change)
    if ('error' in result) {
      setPreferences(previous)
      setError(result.error)
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Notificações' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingTop: 20 + headerInset }]}>
        {preferences === undefined ? (
          <ActivityIndicator style={styles.loading} color={colors.primary} />
        ) : preferences === null ? (
          <Text style={styles.failed}>Não foi possível carregar suas preferências.</Text>
        ) : (
          <>
            <Card style={styles.row}>
              <View style={styles.rowBody}>
                <Text style={styles.title}>E-mail</Text>
                <Text style={styles.detail}>Confirmações, lembretes e avisos importantes</Text>
              </View>
              <Switch
                testID="pref-email"
                value={preferences.notif_email}
                onValueChange={(value) => save({ notif_email: value })}
                trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.15)' }}
                thumbColor="#FFFFFF"
                accessibilityLabel="Avisos por e-mail"
              />
            </Card>

            <Card style={styles.row}>
              <View style={styles.rowBody}>
                <Text style={styles.title}>Notificações no celular</Text>
                <Text style={styles.detail}>Os mesmos avisos do sino, mesmo com o app fechado</Text>
              </View>
              <Switch
                testID="pref-push"
                value={preferences.notif_push}
                onValueChange={(value) => save({ notif_push: value })}
                trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.15)' }}
                thumbColor="#FFFFFF"
                accessibilityLabel="Notificações no celular"
              />
            </Card>

            <Card style={styles.block}>
              <Text style={styles.title}>Novos eventos do grupo</Text>
              <Text style={styles.detail}>Como avisar quando um grupo que você participa criar um evento</Text>
              <View style={styles.channels}>
                {CHANNELS.map((item) => {
                  const selected = item.value === preferences.notif_new_event_channel
                  return (
                    <Pressable
                      key={item.value}
                      testID={`pref-channel-${item.value.toLowerCase()}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => save({ notif_new_event_channel: item.value })}
                      style={[styles.chip, selected && styles.chipSelected]}>
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item.label}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </Card>

            <Text style={styles.note}>
              Os avisos aparecem também no sino, no topo das abas. Notificações no celular (push) ainda não estão
              disponíveis no app.
            </Text>
            {error && <Text style={styles.error}>{error}</Text>}
          </>
        )}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  loading: { marginTop: 48 },
  failed: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 48 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  rowBody: { flex: 1, gap: 2 },
  block: { padding: 16, gap: 6 },
  title: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  detail: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.text50 },
  channels: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  chipSelected: { borderColor: 'rgba(74,222,128,0.45)', backgroundColor: 'rgba(74,222,128,0.1)' },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text70 },
  chipTextSelected: { fontFamily: fonts.bodyBold, color: colors.primary },
  note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.text40, textAlign: 'center' },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.destructive, textAlign: 'center' },
})
