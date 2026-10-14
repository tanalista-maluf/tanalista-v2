import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Link2, Lock, LogOut, MapPin, Share2, Users } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { EventCard, type EventCardData } from '@/components/event-card'
import { GroupAvatar, memberLabel } from '@/components/group-card'
import { Badge, Button, Card, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { decideGroupRequest, joinGroup, leaveGroup } from '@/lib/api'
import { useHeaderInset } from '@/lib/header'
import { shareLink } from '@/lib/share'
import { supabase } from '@/lib/supabase'
import { colors, fonts } from '@/lib/theme'

type GroupDetail = {
  id: string
  name: string
  slug: string | null
  description: string | null
  city: string | null
  category: string | null
  visibility: string
  avatar_url: string | null
  member_count: number
  invite_token: string | null
}

type Member = { user_id: string; role: string; profiles: { full_name: string; username: string } | null }
type JoinRequest = { id: string; name: string; username: string | null }

// Pedidos de entrada pendentes, com o nome de quem pediu. Só o dono os enxerga.
async function fetchRequests(groupId: string): Promise<JoinRequest[]> {
  const { data: requests } = await supabase
    .from('group_join_requests')
    .select('id, user_id')
    .eq('group_id', groupId)
    .eq('status', 'PENDING')
    .order('created_at')

  if (!requests?.length) return []

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, username')
    .in(
      'id',
      requests.map((request) => request.user_id)
    )

  return requests.map((request) => {
    const profile = profiles?.find((p) => p.id === request.user_id)
    return { id: request.id, name: profile?.full_name ?? 'Alguém', username: profile?.username ?? null }
  })
}

async function fetchGroup(groupId: string, userId: string) {
  const [{ data: group }, { data: membership }, { data: members }, { data: events }] = await Promise.all([
    supabase
      .from('groups')
      .select('id, name, slug, description, city, category, visibility, avatar_url, member_count, invite_token')
      .eq('id', groupId)
      .maybeSingle(),
    supabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', userId).maybeSingle(),
    supabase
      .from('group_members')
      .select('user_id, role, profiles(full_name, username)')
      .eq('group_id', groupId)
      .order('joined_at')
      .limit(200),
    supabase
      .from('events')
      .select('id, title, starts_at, city, price, capacity, confirmed_count, visibility')
      .eq('group_id', groupId)
      .in('status', ['OPEN', 'PENDING', 'CONFIRMED'])
      .gte('starts_at', new Date().toISOString())
      .order('starts_at')
      .limit(50),
  ])

  const role = membership?.role ?? null
  return {
    group: group as GroupDetail | null,
    role,
    members: (members ?? []) as Member[],
    events: (events ?? []).map((event) => ({ ...event, groups: null })) as EventCardData[],
    requests: role === 'OWNER' ? await fetchRequests(groupId) : [],
  }
}

type Loaded = Awaited<ReturnType<typeof fetchGroup>>

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useSession()
  const headerInset = useHeaderInset()
  const userId = session!.user.id

  const [data, setData] = useState<Loaded | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  // Pedido de entrada que está sendo aprovado ou recusado
  const [deciding, setDeciding] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Recarrega também ao voltar da página de um evento do grupo
  useFocusEffect(
    useCallback(() => {
      let active = true
      fetchGroup(id, userId).then((result) => {
        if (active) setData(result)
      })
      return () => {
        active = false
      }
    }, [id, userId])
  )

  async function reload() {
    setData(await fetchGroup(id, userId))
  }

  async function handleJoin() {
    setBusy(true)
    setMessage(null)
    const joined = await joinGroup(id)
    if ('error' in joined) setMessage(joined.error)
    await reload()
    setBusy(false)
  }

  function confirmLeave() {
    Alert.alert('Sair do grupo?', 'Você deixa de ver os eventos privados deste grupo.', [
      { text: 'Ficar', style: 'cancel' },
      { text: 'Sim, sair', style: 'destructive', onPress: handleLeave },
    ])
  }

  async function handleLeave() {
    setBusy(true)
    setMessage(null)
    const left = await leaveGroup(id)
    if ('error' in left) {
      setMessage(left.error)
      setBusy(false)
      return
    }
    // Um grupo privado deixa de existir para quem saiu
    router.back()
  }

  async function handleDecision(requestId: string, decision: 'APPROVED' | 'REJECTED') {
    setDeciding(requestId)
    setMessage(null)
    const decided = await decideGroupRequest(requestId, decision)
    if ('error' in decided) setMessage(decided.error)
    await reload()
    setDeciding(null)
  }

  if (data === undefined) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <ActivityIndicator style={styles.centered} color={colors.primary} />
      </Screen>
    )
  }

  const { group, role, members, events, requests } = data

  if (group === null) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <Text style={styles.notFound}>Grupo não encontrado.</Text>
      </Screen>
    )
  }

  const isOwner = role === 'OWNER'
  const isPrivate = group.visibility === 'PRIVATE'

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable
              testID="share"
              accessibilityRole="button"
              accessibilityLabel="Compartilhar grupo"
              onPress={() => shareLink(group.name, `/g/${group.slug ?? group.id}`)}
              hitSlop={12}>
              <Share2 size={22} color={colors.text70} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingTop: 16 + headerInset }]}>
        <Card style={styles.hero}>
          <View style={styles.heroRow}>
            <GroupAvatar group={group} size={64} />
            <View style={styles.heroBody}>
              <Text testID="group-name" style={styles.name}>
                {group.name}
              </Text>
              <View style={styles.badges}>
                {isPrivate && <Badge label="Privado" tone="muted" />}
                {group.category ? <Badge label={group.category} tone="primary" /> : null}
              </View>
            </View>
          </View>

          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Users size={14} color={colors.text50} />
              <Text testID="group-members-count" style={styles.metaText}>
                {memberLabel(group.member_count)}
              </Text>
            </View>
            {group.city ? (
              <View style={styles.metaItem}>
                <MapPin size={14} color={colors.text50} />
                <Text style={styles.metaText}>{group.city}</Text>
              </View>
            ) : null}
          </View>

          {group.description ? <Text style={styles.description}>{group.description}</Text> : null}

          {!role && !isPrivate && (
            <Button testID="group-join" label="Entrar no grupo" onPress={handleJoin} loading={busy} />
          )}
          {!role && isPrivate && (
            <View style={styles.inline}>
              <Lock size={14} color={colors.text50} />
              <Text style={styles.inlineText}>Grupo privado: a entrada é por convite do dono.</Text>
            </View>
          )}
          {role && !isOwner && (
            <Pressable
              testID="group-leave"
              accessibilityRole="button"
              onPress={confirmLeave}
              disabled={busy}
              hitSlop={8}
              style={styles.leave}>
              {busy ? (
                <ActivityIndicator color={colors.destructive} />
              ) : (
                <>
                  <LogOut size={15} color={colors.destructive} />
                  <Text style={styles.leaveText}>Sair do grupo</Text>
                </>
              )}
            </Pressable>
          )}
          {isOwner && (
            <Text testID="group-owner" style={styles.ownerNote}>
              Você é o dono deste grupo. Edição, comunicados e eventos novos ficam no site.
            </Text>
          )}
          {isOwner && isPrivate && group.invite_token ? (
            <Pressable
              testID="group-invite"
              accessibilityRole="button"
              onPress={() => shareLink(`Convite para o grupo ${group.name}`, `/grupos/entrar/${group.invite_token}`)}
              style={({ pressed }) => [styles.invite, pressed && styles.dim]}>
              <Link2 size={16} color={colors.primary} />
              <Text style={styles.inviteText}>Enviar link de convite</Text>
            </Pressable>
          ) : null}
          {message && <Text style={styles.error}>{message}</Text>}
        </Card>

        {requests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Pedidos de entrada</Text>
            {requests.map((request, index) => (
              <Card key={request.id} style={styles.request}>
                <View style={styles.personBody}>
                  <Text style={styles.personName}>{request.name}</Text>
                  {request.username ? <Text style={styles.personUser}>@{request.username}</Text> : null}
                </View>
                {deciding === request.id ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <Pressable
                      testID={`request-reject-${index}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Recusar ${request.name}`}
                      onPress={() => handleDecision(request.id, 'REJECTED')}
                      disabled={deciding !== null}
                      hitSlop={8}>
                      <Text style={styles.reject}>Recusar</Text>
                    </Pressable>
                    <Pressable
                      testID={`request-approve-${index}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Aprovar ${request.name}`}
                      onPress={() => handleDecision(request.id, 'APPROVED')}
                      disabled={deciding !== null}
                      style={styles.approve}>
                      <Text style={styles.approveText}>Aprovar</Text>
                    </Pressable>
                  </>
                )}
              </Card>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Próximos eventos</Text>
          {events.length === 0 ? (
            <Text testID="group-no-events" style={styles.emptyText}>
              Nenhum evento por vir neste grupo.
            </Text>
          ) : (
            events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
              />
            ))
          )}
        </View>

        {members.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Membros</Text>
            <Card style={styles.members}>
              {members.map((member, index) => (
                <Pressable
                  key={member.user_id}
                  accessibilityRole="button"
                  disabled={!member.profiles?.username}
                  onPress={() =>
                    router.push({ pathname: '/users/[username]', params: { username: member.profiles!.username } })
                  }
                  style={[styles.member, index > 0 && styles.memberDivider]}>
                  <View style={styles.personBody}>
                    <Text style={styles.personName}>{member.profiles?.full_name ?? 'Membro'}</Text>
                    {member.profiles?.username ? (
                      <Text style={styles.personUser}>@{member.profiles.username}</Text>
                    ) : null}
                  </View>
                  {member.role === 'OWNER' && <Badge label="Dono" tone="primary" />}
                </Pressable>
              ))}
            </Card>
          </View>
        )}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  centered: { flex: 1 },
  notFound: { fontFamily: fonts.body, color: colors.muted, textAlign: 'center', marginTop: 140, fontSize: 15 },
  content: { padding: 16, gap: 20, paddingBottom: 32 },
  hero: { padding: 18, gap: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroBody: { flex: 1, gap: 8 },
  name: { fontFamily: fonts.headingBlack, fontSize: 22, lineHeight: 27, letterSpacing: -0.4, color: colors.text },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: fonts.body, fontSize: 14, color: colors.text50 },
  description: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.foreground },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineText: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text50 },
  leave: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 },
  leaveText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.destructive },
  ownerNote: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.text50 },
  invite: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.3)',
    backgroundColor: 'rgba(74,222,128,0.08)',
  },
  inviteText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },
  dim: { opacity: 0.6 },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.destructive, textAlign: 'center' },
  section: { gap: 10 },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.text40,
  },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  request: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  reject: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text50 },
  approve: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  approveText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primaryForeground },
  members: { paddingHorizontal: 16 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  memberDivider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  personBody: { flex: 1, gap: 2 },
  personName: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  personUser: { fontFamily: fonts.body, fontSize: 13, color: colors.text50 },
})
