import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { Camera, CheckCircle2, Send, Star, Trash2 } from 'lucide-react-native'
import { useState } from 'react'
import { ActivityIndicator, Alert, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { Avatar } from '@/components/avatar'
import { Badge, Button, Card } from '@/components/ui'
import {
  deleteComment,
  postComment,
  submitRating,
  uploadEventPhoto,
  votePoll,
  type EventExtras,
  type EventTeam,
  type Person,
  type Poll,
} from '@/lib/api'
import { formatLongDate, formatPrice, formatRelative } from '@/lib/format'
import { colors, fonts, radius } from '@/lib/theme'

// Seções da página do evento além dos detalhes. Cada uma recebe o que o
// servidor mandou (EventExtras) e avisa por onChanged quando gravou algo.

function personName(profile: Person) {
  return profile?.full_name ?? (profile?.username ? `@${profile.username}` : 'Alguém')
}

function openProfile(profile: Person) {
  if (profile?.username) router.push({ pathname: '/users/[username]', params: { username: profile.username } })
}

// ── Participantes ────────────────────────────────────────────────────────────

export function ParticipantsSection({ extras, teams }: { extras: EventExtras; teams: EventTeam[] }) {
  if (extras.participants.length === 0) {
    return (
      <Text testID="participants-empty" style={styles.empty}>
        Ninguém se inscreveu ainda.
      </Text>
    )
  }

  // Evento com times: uma lista por time, na ordem dos times, e por último
  // quem ficou sem time (inscrições anteriores aos times)
  if (teams.length > 1) {
    const withoutTeam = extras.participants.filter((p) => !teams.some((team) => team.id === p.team_id))
    return (
      <View style={styles.teams}>
        {teams.map((team, index) => (
          <TeamBlock
            key={team.id}
            testID={`participants-team-${index}`}
            title={team.name}
            detail={`${team.confirmed_count}/${team.capacity}`}
            participants={extras.participants.filter((p) => p.team_id === team.id)}
          />
        ))}
        {withoutTeam.length > 0 && <TeamBlock title="Sem time" participants={withoutTeam} />}
      </View>
    )
  }

  return <ParticipantList participants={extras.participants} teams={teams} />
}

type Participant = EventExtras['participants'][number]

function TeamBlock(props: { title: string; detail?: string; participants: Participant[]; testID?: string }) {
  return (
    <View testID={props.testID} style={styles.team}>
      <View style={styles.teamHeader}>
        <Text style={styles.teamName}>{props.title}</Text>
        {props.detail && <Text style={styles.teamCount}>{props.detail}</Text>}
      </View>
      {props.participants.length === 0 ? (
        <Text style={styles.teamEmpty}>Ninguém neste time ainda.</Text>
      ) : (
        <ParticipantList participants={props.participants} teams={[]} />
      )}
    </View>
  )
}

function ParticipantList({ participants, teams }: { participants: Participant[]; teams: EventTeam[] }) {
  return (
    <Card style={styles.list}>
      {participants.map((participant, index) => {
        const team = teams.find((item) => item.id === participant.team_id)
        return (
          <Pressable
            key={participant.id}
            testID={`participant-${participant.id}`}
            accessibilityRole="button"
            disabled={!participant.profile?.username}
            onPress={() => openProfile(participant.profile)}
            style={[styles.row, index > 0 && styles.divider]}>
            <Avatar name={personName(participant.profile)} url={participant.profile?.avatar_url} size={36} />
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{personName(participant.profile)}</Text>
              <Text style={styles.rowDetail}>
                {participant.profile?.username ? `@${participant.profile.username}` : ''}
                {team ? `${participant.profile?.username ? ' · ' : ''}${team.name}` : ''}
              </Text>
            </View>
            {participant.status === 'PENDING' && <Badge label="Pendente" tone="warning" />}
          </Pressable>
        )
      })}
    </Card>
  )
}

// ── Mural ────────────────────────────────────────────────────────────────────

export function MuralSection(props: { eventId: string; extras: EventExtras; onChanged: () => Promise<void> }) {
  const { eventId, extras, onChanged } = props
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!extras.isMember) {
    return <Text style={styles.empty}>Apenas participantes confirmados podem acessar o mural.</Text>
  }

  async function handleSend() {
    if (!text.trim()) return
    setSending(true)
    setError(null)
    const result = await postComment(eventId, text)
    if ('error' in result) {
      setError(result.error)
    } else {
      setText('')
      Keyboard.dismiss()
    }
    await onChanged()
    setSending(false)
  }

  function confirmDelete(commentId: string) {
    Alert.alert('Apagar mensagem?', 'Ela some do mural para todos.', [
      { text: 'Manter', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          const result = await deleteComment(commentId)
          if ('error' in result) setError(result.error)
          await onChanged()
        },
      },
    ])
  }

  return (
    <View style={styles.stack}>
      {extras.polls.map((poll) => (
        <PollCard key={poll.id} poll={poll} onChanged={onChanged} />
      ))}

      {extras.comments.length === 0 ? (
        <Text testID="mural-empty" style={styles.empty}>
          Nenhuma mensagem ainda. Comece a conversa.
        </Text>
      ) : (
        <Card style={styles.list}>
          {extras.comments.map((comment, index) => (
            <View key={comment.id} style={[styles.comment, index > 0 && styles.divider]}>
              <Avatar name={personName(comment.profile)} url={comment.profile?.avatar_url} size={32} />
              <View style={styles.rowBody}>
                <Text style={styles.commentMeta}>
                  <Text style={styles.commentAuthor}>{personName(comment.profile)}</Text> ·{' '}
                  {formatRelative(comment.created_at)}
                </Text>
                <Text style={styles.commentText}>{comment.content}</Text>
              </View>
              {comment.canDelete && (
                <Pressable
                  testID={`comment-delete-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel="Apagar mensagem"
                  onPress={() => confirmDelete(comment.id)}
                  hitSlop={10}>
                  <Trash2 size={16} color={colors.text35} />
                </Pressable>
              )}
            </View>
          ))}
        </Card>
      )}

      <View style={styles.composer}>
        <TextInput
          testID="mural-input"
          value={text}
          onChangeText={setText}
          placeholder="Escreva no mural"
          placeholderTextColor={colors.text35}
          selectionColor={colors.primary}
          maxLength={500}
          multiline
          style={styles.composerInput}
        />
        <Pressable
          testID="mural-send"
          accessibilityRole="button"
          accessibilityLabel="Publicar mensagem"
          onPress={handleSend}
          disabled={sending || !text.trim()}
          style={[styles.send, (sending || !text.trim()) && styles.dim]}>
          {sending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Send size={18} color={colors.primaryForeground} />
          )}
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

// Enquete: antes de votar, as opções são botões; depois, mostram o resultado
function PollCard({ poll, onChanged }: { poll: Poll; onChanged: () => Promise<void> }) {
  const [voting, setVoting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const voted = poll.user_vote_option_id !== null

  async function handleVote(optionId: string) {
    setVoting(true)
    setError(null)
    const result = await votePoll(poll.id, optionId)
    if ('error' in result) setError(result.error)
    await onChanged()
    setVoting(false)
  }

  return (
    <Card style={styles.poll}>
      <Text style={styles.label}>Enquete</Text>
      <Text style={styles.pollQuestion}>{poll.question}</Text>
      {poll.options.map((option, index) => {
        const pct = poll.total_votes > 0 ? Math.round((option.vote_count / poll.total_votes) * 100) : 0
        const mine = option.id === poll.user_vote_option_id
        return (
          <Pressable
            key={option.id}
            testID={`poll-option-${index}`}
            accessibilityRole="button"
            accessibilityLabel={voted ? `${option.text}: ${pct}%` : `Votar em ${option.text}`}
            disabled={voted || voting}
            onPress={() => handleVote(option.id)}
            style={[styles.pollOption, mine && styles.pollOptionMine]}>
            {voted && <View style={[styles.pollFill, { width: `${pct}%` }]} />}
            <Text style={styles.pollOptionText}>{option.text}</Text>
            {voted && <Text style={styles.pollPct}>{pct}%</Text>}
          </Pressable>
        )
      })}
      <Text style={styles.rowDetail}>
        {poll.total_votes === 1 ? '1 voto' : `${poll.total_votes} votos`}
        {voted ? ' · você já votou' : ''}
      </Text>
      {error && <Text style={styles.error}>{error}</Text>}
    </Card>
  )
}

// ── Regras ───────────────────────────────────────────────────────────────────

export type RulesEvent = {
  price: number
  min_participants: number
  capacity: number
  organizer_exempt: boolean
  custom_rules: string | null
}

// Mesmo texto do site (src/features/eventos/components/EventRules.tsx)
export function RulesSection({ event }: { event: RulesEvent }) {
  const rules = [
    `Valor da inscrição: ${formatPrice(event.price)}`,
    `Mínimo de participantes para confirmação: ${event.min_participants}`,
    `Capacidade máxima: ${event.capacity} pessoas`,
    'Fila de espera: ilimitada',
    'O evento é confirmado automaticamente 12h antes do início, caso o mínimo de participantes seja atingido.',
    ...(event.organizer_exempt ? ['O organizador está isento do pagamento de inscrição.'] : []),
    'Cancelamentos com menos de 12h de antecedência não têm direito a reembolso integral.',
  ]

  return (
    <View style={styles.stack}>
      <Card style={styles.padded}>
        <Text style={styles.label}>Regras do evento</Text>
        {rules.map((rule) => (
          <View key={rule} style={styles.rule}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.ruleText}>{rule}</Text>
          </View>
        ))}
      </Card>
      <Card style={styles.padded}>
        <Text style={styles.label}>Regras e diretrizes do organizador</Text>
        <Text testID="custom-rules" style={event.custom_rules ? styles.ruleText : styles.rowDetail}>
          {event.custom_rules ?? 'Nenhuma regra definida pelo organizador.'}
        </Text>
      </Card>
    </View>
  )
}

// ── Ingresso ─────────────────────────────────────────────────────────────────

// O código é o que o leitor de check-in do site espera (CheckInScanner.tsx)
export function TicketSection(props: { participationId: string; eventTitle: string; checkedInAt: string | null }) {
  if (props.checkedInAt) {
    return (
      <Card style={styles.ticket}>
        <CheckCircle2 size={40} color={colors.primary} />
        <Text style={styles.ticketTitle}>Check-in realizado!</Text>
        <Text style={styles.rowDetail}>{formatLongDate(props.checkedInAt)}</Text>
      </Card>
    )
  }

  return (
    <Card style={styles.ticket}>
      <Text style={styles.ticketTitle}>Seu ingresso</Text>
      <View testID="ticket-qr" style={styles.qr} accessible accessibilityLabel="QR code do ingresso">
        <QRCode value={`tanalista:checkin:${props.participationId}`} size={190} color="#0D1A14" backgroundColor="#FFFFFF" />
      </View>
      <Text style={styles.rowDetail}>{props.eventTitle}</Text>
      <Text style={styles.ticketCode}>{props.participationId.slice(0, 8).toUpperCase()}</Text>
      <Text style={styles.rowDetail}>Apresente este QR code ao organizador na entrada.</Text>
    </Card>
  )
}

// ── Fotos ────────────────────────────────────────────────────────────────────

export function PhotosSection(props: { eventId: string; extras: EventExtras; onChanged: () => Promise<void> }) {
  const { eventId, extras, onChanged } = props
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!extras.isMember) {
    return <Text style={styles.empty}>Apenas participantes confirmados podem ver as fotos.</Text>
  }

  async function handleAdd() {
    setError(null)
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true })
    if (picked.canceled) return

    const asset = picked.assets[0]
    if (!asset.base64) {
      setError('Não foi possível ler a foto escolhida.')
      return
    }
    setUploading(true)
    const mimeType = asset.mimeType === 'image/png' || asset.mimeType === 'image/webp' ? asset.mimeType : 'image/jpeg'
    const result = await uploadEventPhoto(eventId, { base64: asset.base64, mimeType })
    if ('error' in result) setError(result.error)
    await onChanged()
    setUploading(false)
  }

  return (
    <View style={styles.stack}>
      {extras.photoUpload && (
        <Button
          testID="photo-add"
          label="Adicionar foto"
          icon={<Camera size={18} color={colors.primaryForeground} />}
          onPress={handleAdd}
          loading={uploading}
        />
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      {extras.photos.length === 0 ? (
        <Text testID="photos-empty" style={styles.empty}>
          Nenhuma foto ainda.
        </Text>
      ) : (
        <View style={styles.photos}>
          {extras.photos.map((photo) => (
            <Image
              key={photo.id}
              source={photo.url}
              style={styles.photo}
              contentFit="cover"
              accessibilityLabel={`Foto enviada por ${personName(photo.profile)}`}
            />
          ))}
        </View>
      )}
    </View>
  )
}

// ── Avaliações ───────────────────────────────────────────────────────────────

function Stars({ value, size, onSelect }: { value: number; size: number; onSelect?: (value: number) => void }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          testID={onSelect ? `star-${star}` : undefined}
          accessibilityRole={onSelect ? 'button' : undefined}
          accessibilityLabel={onSelect ? `${star} de 5` : undefined}
          disabled={!onSelect}
          onPress={() => onSelect?.(star)}
          hitSlop={onSelect ? 6 : 0}>
          <Star size={size} color={colors.warning} fill={star <= value ? colors.warning : 'transparent'} />
        </Pressable>
      ))}
    </View>
  )
}

// canRate: inscrito confirmado num evento já concluído
export function RatingsSection(props: {
  eventId: string
  extras: EventExtras
  canRate: boolean
  onChanged: () => Promise<void>
}) {
  const { eventId, extras, canRate, onChanged } = props
  const [rating, setRating] = useState(extras.ratings.mine ?? 0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSubmit() {
    if (rating === 0) {
      setNotice({ ok: false, text: 'Escolha de 1 a 5 estrelas.' })
      return
    }
    setSaving(true)
    setNotice(null)
    const result = await submitRating(eventId, rating, comment)
    setNotice('error' in result ? { ok: false, text: result.error } : { ok: true, text: 'Avaliação enviada. Obrigado!' })
    await onChanged()
    setSaving(false)
  }

  return (
    <View style={styles.stack}>
      <Card style={styles.ratingSummary}>
        <Text testID="rating-average" style={styles.ratingAverage}>
          {extras.ratings.count ? String(extras.ratings.average).replace('.', ',') : '—'}
        </Text>
        <Stars value={Math.round(extras.ratings.average)} size={18} />
        <Text style={styles.rowDetail}>
          {extras.ratings.count === 0
            ? 'Ainda sem avaliações'
            : extras.ratings.count === 1
              ? '1 avaliação'
              : `${extras.ratings.count} avaliações`}
        </Text>
      </Card>

      {canRate && (
        <Card style={styles.padded}>
          <Text style={styles.label}>{extras.ratings.mine ? 'Sua avaliação' : 'Avalie o evento'}</Text>
          <Stars value={rating} size={30} onSelect={setRating} />
          <TextInput
            testID="rating-comment"
            value={comment}
            onChangeText={setComment}
            placeholder="Comentário (opcional)"
            placeholderTextColor={colors.text35}
            selectionColor={colors.primary}
            maxLength={500}
            multiline
            style={styles.ratingInput}
          />
          {notice && (
            <Text testID="rating-notice" style={[styles.notice, !notice.ok && styles.error]}>
              {notice.text}
            </Text>
          )}
          <Button testID="rating-submit" label="Enviar avaliação" onPress={handleSubmit} loading={saving} />
        </Card>
      )}

      {extras.ratings.items.length > 0 && (
        <Card style={styles.list}>
          {extras.ratings.items.map((item, index) => (
            <View key={`${item.created_at}-${index}`} style={[styles.comment, index > 0 && styles.divider]}>
              <Avatar name={personName(item.profile)} url={item.profile?.avatar_url} size={32} />
              <View style={styles.rowBody}>
                <Text style={styles.commentAuthor}>{personName(item.profile)}</Text>
                <Stars value={item.rating} size={13} />
                {item.comment ? <Text style={styles.commentText}>{item.comment}</Text> : null}
              </View>
            </View>
          ))}
        </Card>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  empty: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center', paddingVertical: 24 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.text40 },
  list: { paddingHorizontal: 14 },
  teams: { gap: 16 },
  team: { gap: 8 },
  teamHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 },
  teamName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },
  teamCount: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text50 },
  teamEmpty: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, paddingHorizontal: 4 },
  padded: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  rowDetail: { fontFamily: fonts.body, fontSize: 13, color: colors.text50 },
  comment: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  commentMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.text50 },
  commentAuthor: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },
  commentText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.foreground },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  composerInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 13,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.foreground,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  dim: { opacity: 0.5 },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.destructive, textAlign: 'center' },
  notice: { fontFamily: fonts.body, fontSize: 14, color: colors.primary, textAlign: 'center' },
  poll: { padding: 16, gap: 10 },
  pollQuestion: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22, color: colors.text },
  pollOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    overflow: 'hidden',
  },
  pollOptionMine: { borderColor: 'rgba(74,222,128,0.45)' },
  pollFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(74,222,128,0.14)' },
  pollOptionText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.foreground },
  pollPct: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primary },
  rule: { flexDirection: 'row', gap: 8 },
  bullet: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },
  ruleText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text70 },
  ticket: { alignItems: 'center', gap: 12, padding: 22 },
  ticketTitle: { fontFamily: fonts.heading, fontSize: 17, color: colors.text },
  qr: { padding: 12, borderRadius: 14, backgroundColor: '#FFFFFF' },
  ticketCode: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 2, color: colors.text50 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: '31.5%', aspectRatio: 1, borderRadius: radius.card, backgroundColor: colors.input },
  stars: { flexDirection: 'row', gap: 6 },
  ratingSummary: { alignItems: 'center', gap: 6, padding: 18 },
  ratingAverage: { fontFamily: fonts.headingBlack, fontSize: 36, color: colors.text },
  ratingInput: {
    minHeight: 80,
    padding: 14,
    textAlignVertical: 'top',
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.foreground,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
  },
})
