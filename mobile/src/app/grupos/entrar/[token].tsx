import { Link, router, Stack, useLocalSearchParams } from 'expo-router'
import { CheckCheck } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Button, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { runAction } from '@/lib/api'
import { colors, fonts } from '@/lib/theme'

type JoinResult = { groupId: string; groupSlug: string | null; groupName?: string; alreadyMember?: boolean }

// Link de convite de grupo (tanalista.app/grupos/entrar/[token]) aberto de
// dentro do app — mesma action do site (joinGroupByInviteAction), que exige
// sessão: sem conta, a pessoa entra ou se cadastra primeiro e abre o link de novo.
export default function JoinByInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const { session } = useSession()
  const [state, setState] = useState<{ ok: true; result: JoinResult } | { ok: false; error: string } | undefined>(
    undefined
  )

  useEffect(() => {
    if (!session) return
    runAction<JoinResult>('joinGroupByInvite', token).then((res) => {
      if ('ok' in res) setState({ ok: true, result: res.ok })
      else setState({ ok: false, error: 'error' in res ? res.error : 'Não foi possível aceitar o convite.' })
    })
  }, [session, token])

  if (!session) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Convite' }} />
        <View style={styles.centered}>
          <Text style={styles.text}>Entre na sua conta para aceitar o convite. Depois, abra este link de novo.</Text>
          <Button testID="invite-sign-up" label="Criar conta" onPress={() => router.push('/sign-up')} />
          <Link href="/sign-in" style={styles.link}>
            Já tem conta? Entrar
          </Link>
        </View>
      </Screen>
    )
  }

  if (state === undefined) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Convite' }} />
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      </Screen>
    )
  }

  if (!state.ok) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Convite' }} />
        <View style={styles.centered}>
          <Text testID="invite-error" style={styles.text}>
            {state.error}
          </Text>
          <Button label="Voltar" onPress={() => router.replace('/')} />
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Convite' }} />
      <View style={styles.centered}>
        <CheckCheck size={40} color={colors.primary} />
        <Text testID="invite-success" style={styles.title}>
          {state.result.alreadyMember ? 'Você já é membro deste grupo' : `Você entrou em ${state.result.groupName ?? 'o grupo'}`}
        </Text>
        <Button
          testID="invite-go-to-group"
          label="Ver grupo"
          onPress={() => router.replace({ pathname: '/groups/[id]', params: { id: state.result.groupId } })}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  loading: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },
  title: { fontFamily: fonts.heading, fontSize: 18, color: colors.text, textAlign: 'center' },
  text: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.foreground, textAlign: 'center' },
  link: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },
})
