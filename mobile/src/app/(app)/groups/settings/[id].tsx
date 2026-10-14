import * as ImagePicker from 'expo-image-picker'
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Camera, Send } from 'lucide-react-native'
import { useCallback, useState, type ReactNode } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { GroupAvatar } from '@/components/group-card'
import { Badge, Button, Card, Field, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { runAction } from '@/lib/api'
import { useHeaderInset } from '@/lib/header'
import { supabase } from '@/lib/supabase'
import { colors, fonts, radius } from '@/lib/theme'

// Mesma lista do site (src/features/grupos/constants.ts)
const CATEGORIES = ['Esportes', 'Gastronomia', 'Viagens', 'Música', 'Cinema', 'Teatro', 'Arte', 'Tecnologia', 'Negócios', 'Saúde', 'Educação', 'Outros']

type Group = {
  id: string
  name: string
  description: string | null
  city: string | null
  category: string | null
  visibility: string
  avatar_url: string | null
  owner_id: string
}
type Member = { user_id: string; role: string; profiles: { full_name: string; username: string } | null }

async function fetchGroup(groupId: string) {
  const [{ data: group }, { data: members }] = await Promise.all([
    supabase
      .from('groups')
      .select('id, name, description, city, category, visibility, avatar_url, owner_id')
      .eq('id', groupId)
      .maybeSingle(),
    supabase.from('group_members').select('user_id, role, profiles(full_name, username)').eq('group_id', groupId).order('joined_at'),
  ])
  return { group: group as Group | null, members: (members ?? []) as Member[] }
}

// Configurações do dono do grupo: dados, foto, membros, comunicado e exclusão
export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useSession()
  const userId = session!.user.id
  const headerInset = useHeaderInset()
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchGroup>> | undefined>(undefined)
  const [form, setForm] = useState({ name: '', description: '', city: '', category: '', visibility: 'PUBLIC' })
  const [broadcast, setBroadcast] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    const result = await fetchGroup(id)
    setData(result)
    if (result.group) {
      setForm({
        name: result.group.name,
        description: result.group.description ?? '',
        city: result.group.city ?? '',
        category: result.group.category ?? '',
        visibility: result.group.visibility,
      })
    }
  }, [id])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  async function act(key: string, name: string, args: unknown[], success: string) {
    setBusy(key)
    setMessage(null)
    const result = await runAction(name, ...args)
    setMessage('error' in result ? { ok: false, text: result.error } : { ok: true, text: success })
    setBusy(null)
    return !('error' in result)
  }

  if (data === undefined) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Configurações' }} />
        <ActivityIndicator style={styles.flex} color={colors.primary} />
      </Screen>
    )
  }

  const { group, members } = data
  if (!group || group.owner_id !== userId) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Configurações' }} />
        <Text style={styles.failed}>Só o dono do grupo mexe nas configurações.</Text>
      </Screen>
    )
  }

  async function save() {
    if (form.name.trim().length < 3) return setMessage({ ok: false, text: 'O nome precisa de ao menos 3 caracteres.' })
    if (form.city.trim().length < 2) return setMessage({ ok: false, text: 'Informe a cidade.' })
    if (await act('save', 'updateGroup', [id, { ...form, name: form.name.trim(), city: form.city.trim() }], 'Grupo atualizado.')) {
      await load()
    }
  }

  async function changePhoto() {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    })
    if (picked.canceled || !picked.assets[0].base64) return
    const asset = picked.assets[0]
    await act('photo', 'uploadGroupAvatar', [id, { base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' }], 'Foto atualizada.')
    await load()
  }

  function memberActions(member: Member) {
    const name = member.profiles?.full_name ?? 'Membro'
    Alert.alert(name, undefined, [
      {
        text: 'Tornar dono do grupo',
        onPress: () =>
          Alert.alert('Transferir o grupo?', `${name} passa a ser o dono e você vira membro. Não dá para desfazer sozinho.`, [
            { text: 'Voltar', style: 'cancel' },
            {
              text: 'Transferir',
              style: 'destructive',
              onPress: async () => {
                if (await act(member.user_id, 'transferGroupOwnership', [id, member.user_id], 'Grupo transferido.')) {
                  router.back()
                }
              },
            },
          ]),
      },
      {
        text: 'Remover do grupo',
        style: 'destructive',
        onPress: async () => {
          await act(member.user_id, 'removeGroupMember', [id, member.user_id], `${name} saiu do grupo.`)
          await load()
        },
      },
      { text: 'Voltar', style: 'cancel' },
    ])
  }

  function confirmDelete() {
    Alert.alert('Excluir o grupo?', 'O grupo some para todos os membros. Não dá para desfazer.', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          if (await act('delete', 'deleteGroup', [id], 'Grupo excluído.')) router.dismissTo('/groups')
        },
      },
    ])
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Configurações' }} />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: 16 + headerInset }]}>
          {message && (
            <Text testID="settings-message" style={[styles.notice, !message.ok && styles.error]}>
              {message.text}
            </Text>
          )}

          <Section title="Dados do grupo">
            <Pressable testID="settings-photo" accessibilityRole="button" onPress={changePhoto} style={styles.photo}>
              <GroupAvatar group={group} size={64} />
              <View style={styles.photoText}>
                {busy === 'photo' ? <ActivityIndicator color={colors.primary} /> : <Camera size={16} color={colors.primary} />}
                <Text style={styles.link}>Trocar foto</Text>
              </View>
            </Pressable>
            <Field testID="settings-name" label="Nome" value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} maxLength={80} />
            <Field
              testID="settings-city"
              label="Cidade"
              value={form.city}
              onChangeText={(city) => setForm((current) => ({ ...current, city }))}
              maxLength={100}
            />
            <Field
              testID="settings-description"
              label="Descrição"
              value={form.description}
              onChangeText={(description) => setForm((current) => ({ ...current, description }))}
              maxLength={500}
              multiline
              style={styles.multiline}
            />
            <View style={styles.chips}>
              {CATEGORIES.map((item) => (
                <Chip
                  key={item}
                  label={item}
                  selected={form.category === item}
                  onPress={() => setForm((current) => ({ ...current, category: form.category === item ? '' : item }))}
                />
              ))}
            </View>
            <View style={styles.chips}>
              <Chip
                label="Público"
                selected={form.visibility === 'PUBLIC'}
                onPress={() => setForm((current) => ({ ...current, visibility: 'PUBLIC' }))}
              />
              <Chip
                label="Privado"
                selected={form.visibility === 'PRIVATE'}
                onPress={() => setForm((current) => ({ ...current, visibility: 'PRIVATE' }))}
              />
            </View>
            <Button testID="settings-save" label="Salvar" onPress={save} loading={busy === 'save'} />
          </Section>

          <Section title={`Membros (${members.length})`}>
            {members.map((member, index) => (
              <Pressable
                key={member.user_id}
                testID={`settings-member-${index}`}
                accessibilityRole="button"
                disabled={member.role === 'OWNER'}
                onPress={() => memberActions(member)}
                style={[styles.row, index > 0 && styles.divider]}>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{member.profiles?.full_name ?? 'Membro'}</Text>
                  {member.profiles?.username ? <Text style={styles.detail}>@{member.profiles.username}</Text> : null}
                </View>
                {member.role === 'OWNER' ? <Badge label="Dono" tone="primary" /> : <Text style={styles.detail}>Opções</Text>}
              </Pressable>
            ))}
          </Section>

          <Section title="Comunicado aos membros">
            <TextInput
              testID="settings-broadcast"
              value={broadcast}
              onChangeText={setBroadcast}
              placeholder="Aviso para todos os membros do grupo"
              placeholderTextColor={colors.text35}
              multiline
              maxLength={500}
              style={styles.area}
            />
            <Button
              testID="settings-broadcast-send"
              label="Enviar comunicado"
              icon={<Send size={17} color={colors.primaryForeground} />}
              onPress={async () => {
                if (await act('broadcast', 'sendGroupBroadcast', [id, broadcast], 'Comunicado enviado.')) setBroadcast('')
              }}
              loading={busy === 'broadcast'}
            />
          </Section>

          {group.visibility === 'PRIVATE' && (
            <Pressable
              testID="settings-invite-reset"
              accessibilityRole="button"
              onPress={() => act('invite', 'regenerateGroupInvite', [id], 'Link de convite trocado. O anterior parou de valer.')}
              style={styles.secondary}>
              <Text style={styles.secondaryText}>Trocar link de convite</Text>
            </Pressable>
          )}

          <Pressable testID="settings-delete" accessibilityRole="button" onPress={confirmDelete} style={styles.danger}>
            <Text style={styles.dangerText}>Excluir grupo</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </Card>
  )
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  failed: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center', marginTop: 140, fontSize: 15, padding: 24 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  notice: { fontFamily: fonts.body, fontSize: 14, color: colors.primary, textAlign: 'center' },
  error: { color: colors.destructive },
  section: { padding: 16, gap: 14 },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 16, color: colors.text },
  photo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  photoText: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  link: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },
  multiline: { height: 100, paddingTop: 14, textAlignVertical: 'top', borderRadius: radius.card },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  chipSelected: { borderColor: 'rgba(74,222,128,0.45)', backgroundColor: 'rgba(74,222,128,0.1)' },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text70 },
  chipTextSelected: { color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  detail: { fontFamily: fonts.body, fontSize: 12, color: colors.text50 },
  area: {
    minHeight: 90,
    padding: 12,
    textAlignVertical: 'top',
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.foreground,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  secondary: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  secondaryText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.foreground },
  danger: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    backgroundColor: 'rgba(248,113,113,0.05)',
  },
  dangerText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.destructive },
})
