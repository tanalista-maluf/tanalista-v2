import { Stack } from 'expo-router'
import { ShieldCheck } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Card, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { formatLongDate } from '@/lib/format'
import { useHeaderInset } from '@/lib/header'
import { supabase } from '@/lib/supabase'
import { colors, fonts } from '@/lib/theme'

// Mesmos nomes do site (src/features/auditoria/components/AuditLogList.tsx)
const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Acesso à conta',
  LOGOUT: 'Saída da conta',
  PROFILE_UPDATED: 'Perfil atualizado',
  GROUP_CREATED: 'Grupo criado',
  GROUP_JOINED: 'Entrou em um grupo',
  GROUP_LEFT: 'Saiu de um grupo',
  EVENT_CREATED: 'Evento criado',
  EVENT_PUBLISHED: 'Evento publicado',
  EVENT_CANCELLED: 'Evento cancelado',
  PARTICIPATION_JOINED: 'Inscrito em evento',
  PARTICIPATION_CANCELLED: 'Inscrição cancelada',
  WAITLIST_JOINED: 'Entrou na fila de espera',
  WAITLIST_LEFT: 'Saiu da fila de espera',
  WITHDRAWAL_REQUESTED: 'Saque solicitado',
  PASSWORD_RESET: 'Senha redefinida',
}

type AuditLog = { id: string; action: string; created_at: string }

export default function ActivityScreen() {
  const { session } = useSession()
  const headerInset = useHeaderInset()
  const userId = session!.user.id
  const [logs, setLogs] = useState<AuditLog[] | null | undefined>(undefined)

  useEffect(() => {
    let active = true
    supabase
      .from('audit_logs')
      .select('id, action, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data, error }) => {
        if (active) setLogs(error ? null : data)
      })
    return () => {
      active = false
    }
  }, [userId])

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Atividade da conta' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingTop: 20 + headerInset }]}>
        <View style={styles.intro}>
          <ShieldCheck size={18} color={colors.text50} />
          <Text style={styles.introText}>
            Por segurança, registramos as ações mais importantes da sua conta. Se identificar atividade suspeita, troque
            sua senha imediatamente.
          </Text>
        </View>

        {logs === undefined ? (
          <ActivityIndicator style={styles.loading} color={colors.primary} />
        ) : logs === null ? (
          <Text style={styles.empty}>Não foi possível carregar a atividade.</Text>
        ) : logs.length === 0 ? (
          <Text testID="activity-empty" style={styles.empty}>
            Nenhuma atividade registrada.
          </Text>
        ) : (
          <Card style={styles.list}>
            {logs.map((log, index) => (
              <View key={log.id} style={[styles.row, index > 0 && styles.rowDivider]}>
                <View style={styles.dot} />
                <View style={styles.rowBody}>
                  <Text style={styles.action}>{ACTION_LABELS[log.action] ?? log.action}</Text>
                  <Text style={styles.date}>{formatLongDate(log.created_at)}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  intro: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  introText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.text50 },
  loading: { marginTop: 48 },
  empty: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 48 },
  list: { paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  rowBody: { flex: 1, gap: 2 },
  action: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  date: { fontFamily: fonts.body, fontSize: 13, color: colors.text50 },
})
