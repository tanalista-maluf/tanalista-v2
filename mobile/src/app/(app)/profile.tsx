import { Stack } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Card, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { deleteAccount } from '@/lib/api'
import { useHeaderInset } from '@/lib/header'
import { colors, fonts, radius } from '@/lib/theme'

export default function ProfileScreen() {
  const { session, profile, signOut, forgetSession } = useSession()
  const headerInset = useHeaderInset()
  const [deleting, setDeleting] = useState(false)
  const [problem, setProblem] = useState<{ message: string; blockers: string[] } | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setProblem(null)
    const result = await deleteAccount()
    if ('error' in result) {
      setDeleting(false)
      setProblem({ message: result.error, blockers: ('blockers' in result && result.blockers) || [] })
      return
    }
    // A conta já não existe: basta esquecer a sessão guardada no aparelho
    await forgetSession()
  }

  function confirmDelete() {
    Alert.alert(
      'Excluir conta',
      'Seus dados pessoais são apagados e você perde o acesso. Não dá para desfazer.',
      [
        { text: 'Manter conta', style: 'cancel' },
        { text: 'Excluir definitivamente', style: 'destructive', onPress: handleDelete },
      ]
    )
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Perfil' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingTop: 20 + headerInset }]}>
        <Card style={styles.card}>
          <Text testID="profile-name" style={styles.name}>
            {profile?.full_name ?? 'Sua conta'}
          </Text>
          {profile ? <Text style={styles.username}>@{profile.username}</Text> : null}
          <View style={styles.divider} />
          <Info label="E-mail" value={session?.user.email ?? '—'} />
          {profile?.city ? <Info label="Cidade" value={profile.city} /> : null}
        </Card>

        <Pressable
          testID="sign-out"
          accessibilityRole="button"
          onPress={signOut}
          style={({ pressed }) => [styles.action, pressed && styles.dim]}>
          <Text style={styles.actionText}>Sair</Text>
        </Pressable>

        <View style={styles.danger}>
          <Text style={styles.label}>Excluir conta</Text>
          <Text style={styles.dangerText}>
            Apaga seus dados pessoais e encerra seu acesso de forma definitiva. O histórico de eventos e pagamentos
            continua existindo, sem o seu nome.
          </Text>

          {problem && (
            <View testID="delete-blockers" style={styles.alert}>
              <Text style={styles.alertTitle}>{problem.message}</Text>
              {problem.blockers.map((blocker) => (
                <Text key={blocker} style={styles.alertText}>
                  • {blocker}
                </Text>
              ))}
            </View>
          )}

          <Pressable
            testID="delete-account"
            accessibilityRole="button"
            onPress={confirmDelete}
            disabled={deleting}
            style={({ pressed }) => [styles.action, styles.deleteAction, (pressed || deleting) && styles.dim]}>
            {deleting ? (
              <ActivityIndicator color={colors.destructive} />
            ) : (
              <Text style={[styles.actionText, styles.deleteText]}>Excluir minha conta</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  card: { padding: 18, gap: 12 },
  name: { fontFamily: fonts.headingBlack, fontSize: 22, color: colors.text, letterSpacing: -0.4 },
  username: { fontFamily: fonts.body, fontSize: 15, color: colors.text50, marginTop: -8 },
  divider: { height: 1, backgroundColor: colors.cardBorder },
  info: { gap: 4 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.text40 },
  infoValue: { fontFamily: fonts.body, fontSize: 15, color: colors.foreground },
  action: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  actionText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.foreground },
  dim: { opacity: 0.6 },
  danger: { gap: 12, marginTop: 24 },
  dangerText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text50 },
  deleteAction: { borderColor: 'rgba(248,113,113,0.3)', backgroundColor: 'rgba(248,113,113,0.05)' },
  deleteText: { color: colors.destructive },
  alert: {
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    backgroundColor: 'rgba(248,113,113,0.05)',
    borderRadius: 12,
    padding: 12,
  },
  alertTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.destructive },
  alertText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.foreground },
})
