import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import {
  BellRing,
  Camera,
  ChevronRight,
  CircleUserRound,
  FileText,
  History,
  KeyRound,
  LogOut,
  ShieldCheck,
  UserRoundPen,
} from 'lucide-react-native'
import { useState, type ReactNode } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Avatar } from '@/components/avatar'
import { Card, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { deleteAccount, uploadAvatar } from '@/lib/api'
import { useTabHeaderInset } from '@/lib/header'
import { colors, fonts, radius } from '@/lib/theme'

// Termos e política ficam nas páginas do site
const SITE_URL = 'https://www.tanalista.app'

export default function ProfileScreen() {
  const { session, profile, signOut, forgetSession, refreshProfile } = useSession()
  const headerInset = useTabHeaderInset()
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [problem, setProblem] = useState<{ message: string; blockers: string[] } | null>(null)

  async function handlePhoto() {
    setPhotoError(null)
    // O seletor do sistema não pede permissão: o app só recebe a foto escolhida
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      // comprime para caber no limite de 2MB do servidor
      quality: 0.6,
      base64: true,
    })
    if (picked.canceled) return

    const asset = picked.assets[0]
    if (!asset.base64) {
      setPhotoError('Não foi possível ler a foto escolhida.')
      return
    }
    setUploading(true)
    const result = await uploadAvatar({ base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' })
    if ('error' in result) setPhotoError(result.error)
    else await refreshProfile()
    setUploading(false)
  }

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

  const name = profile?.full_name ?? 'Sua conta'

  return (
    <Screen>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.content, { paddingTop: 20 + headerInset }]}>
        <Card style={styles.card}>
          <Pressable
            testID="change-photo"
            accessibilityRole="button"
            accessibilityLabel="Alterar foto de perfil"
            onPress={handlePhoto}
            disabled={uploading}
            style={styles.photo}>
            <Avatar name={name} url={profile?.avatar_url} size={72} />
            <View style={styles.photoBadge}>
              {uploading ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Camera size={14} color={colors.primaryForeground} />
              )}
            </View>
          </Pressable>
          <View style={styles.identity}>
            <Text testID="profile-name" style={styles.name}>
              {name}
            </Text>
            {profile ? <Text style={styles.username}>@{profile.username}</Text> : null}
            <Text style={styles.detail}>{session?.user.email ?? '—'}</Text>
            {profile?.city ? <Text style={styles.detail}>{profile.city}</Text> : null}
          </View>
        </Card>
        {photoError && (
          <Text testID="photo-error" style={styles.error}>
            {photoError}
          </Text>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Conta</Text>
          <Card>
            <Row
              testID="go-edit-profile"
              icon={<UserRoundPen size={19} color={colors.primary} />}
              title="Dados pessoais"
              detail="Nome, WhatsApp, cidade e bio"
              onPress={() => router.push('/account/edit')}
            />
            <Row
              testID="go-security"
              icon={<KeyRound size={19} color={colors.primary} />}
              title="Senha e e-mail"
              detail="Alterar senha ou e-mail"
              onPress={() => router.push('/account/security')}
              divider
            />
            <Row
              testID="go-notification-settings"
              icon={<BellRing size={19} color={colors.primary} />}
              title="Notificações"
              detail="E-mail e avisos de novos eventos"
              onPress={() => router.push('/account/notifications')}
              divider
            />
            <Row
              testID="go-activity"
              icon={<History size={19} color={colors.primary} />}
              title="Atividade da conta"
              detail="Histórico de ações"
              onPress={() => router.push('/account/activity')}
              divider
            />
            {profile ? (
              <Row
                testID="go-public-profile"
                icon={<CircleUserRound size={19} color={colors.primary} />}
                title="Perfil público"
                detail="Como as outras pessoas veem você"
                onPress={() => router.push({ pathname: '/users/[username]', params: { username: profile.username } })}
                divider
              />
            ) : null}
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Legal</Text>
          <Card>
            <Row
              testID="go-terms"
              icon={<FileText size={19} color={colors.primary} />}
              title="Termos de uso"
              detail="Condições de utilização da plataforma"
              onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/termos`)}
            />
            <Row
              testID="go-privacy"
              icon={<ShieldCheck size={19} color={colors.primary} />}
              title="Política de privacidade"
              detail="Como usamos seus dados"
              onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/privacidade`)}
              divider
            />
          </Card>
        </View>

        <Pressable
          testID="sign-out"
          accessibilityRole="button"
          onPress={signOut}
          style={({ pressed }) => [styles.action, pressed && styles.dim]}>
          <LogOut size={17} color={colors.foreground} />
          <Text style={styles.actionText}>Sair da conta</Text>
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

function Row(props: {
  testID: string
  icon: ReactNode
  title: string
  detail: string
  onPress: () => void
  divider?: boolean
}) {
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={`${props.title}. ${props.detail}`}
      onPress={props.onPress}
      style={({ pressed }) => [styles.row, props.divider && styles.rowDivider, pressed && styles.dim]}>
      {props.icon}
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{props.title}</Text>
        <Text style={styles.rowDetail}>{props.detail}</Text>
      </View>
      <ChevronRight size={18} color={colors.text35} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18 },
  photo: { width: 72, height: 72 },
  photoBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  identity: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.headingBlack, fontSize: 20, color: colors.text, letterSpacing: -0.4 },
  username: { fontFamily: fonts.body, fontSize: 14, color: colors.text50, marginBottom: 4 },
  detail: { fontFamily: fonts.body, fontSize: 13, color: colors.text50 },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.destructive, textAlign: 'center', marginTop: -8 },
  section: { gap: 10 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.text40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  rowDetail: { fontFamily: fonts.body, fontSize: 13, color: colors.text50 },
  action: {
    flexDirection: 'row',
    gap: 8,
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
  danger: { gap: 12, marginTop: 12 },
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
