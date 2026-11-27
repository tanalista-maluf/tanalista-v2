import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { ImagePlus, Minus, Plus } from 'lucide-react-native'
import { useEffect, useState, type ReactNode } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DateTimeField } from '@/components/date-time-field'
import { Dropdown } from '@/components/dropdown'
import { Button, Card, Field, Screen } from '@/components/ui'
import { useSession } from '@/ctx'
import { runAction } from '@/lib/api'
import { useHeaderInset } from '@/lib/header'
import { formatMoney } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { colors, fonts, radius } from '@/lib/theme'

// Mesmas opções do formulário do site (src/features/eventos/components/EventForm.tsx)
const CATEGORIES = [
  'Futebol',
  'Basquete',
  'Vôlei',
  'Airsoft & Paintball',
  'Corrida & Trilha',
  'Gastronomia',
  'Negócios',
  'Ensino',
  'Música',
  'Social',
  'Outros',
]
const CANCEL_POLICIES: { value: number | null; label: string }[] = [
  { value: null, label: 'Não permitido' },
  { value: 0, label: 'Sempre' },
  { value: 24, label: 'Até 24h antes' },
  { value: 48, label: 'Até 48h antes' },
  { value: 72, label: 'Até 72h antes' },
  { value: 168, label: 'Até 7 dias antes' },
]
const RECURRENCES = [
  { value: 'none', label: 'Não repete' },
  { value: 'weekly', label: 'Toda semana' },
  { value: 'biweekly', label: 'A cada 2 semanas' },
  { value: 'monthly', label: 'Todo mês' },
] as const

// Sem times ou de 2 a 10 times
const TEAM_COUNTS = [
  { key: '0', label: 'Sem times' },
  ...Array.from({ length: 9 }, (_, i) => ({ key: String(i + 2), label: `${i + 2} times` })),
]

type Team = { name: string; capacity: string }

function teamName(index: number) {
  return `Time ${String.fromCharCode(65 + index)}`
}

// recurrence_rule gravado pelo servidor -> opção do formulário
function recurrenceFromRule(rule: string | null): (typeof RECURRENCES)[number]['value'] {
  if (!rule) return 'none'
  if (rule.includes('MONTHLY')) return 'monthly'
  return rule.includes('INTERVAL=2') ? 'biweekly' : 'weekly'
}
type Group = { id: string; name: string }

function defaultStart() {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  date.setHours(19, 0, 0, 0)
  return date
}

// Evento criado, editado ou duplicado: o site responde com o endereço da
// página nova (/eventos/<slug>); o app acha o evento pelo id ou pelo slug
async function eventIdFrom(path: string) {
  const key = path.split('/').pop() ?? ''
  const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)
  const { data } = await supabase.from('events').select('id').eq(isId ? 'id' : 'slug', key).maybeSingle()
  return data?.id ?? null
}

function openEvent(id: string | null) {
  if (id) router.replace({ pathname: '/events/[id]', params: { id } })
  else router.back()
}

type Cover = { uri: string; base64: string; mimeType: string }

// mode: create (novo, opcionalmente num grupo), edit ou duplicate (a partir de eventId)
export default function EventFormScreen() {
  const params = useLocalSearchParams<{ mode?: string; eventId?: string; groupId?: string }>()
  const mode = params.mode === 'edit' || params.mode === 'duplicate' ? params.mode : 'create'
  const { session, profile } = useSession()
  const insets = useSafeAreaInsets()
  const headerInset = useHeaderInset()

  const [loading, setLoading] = useState(mode !== 'create')
  // Evento já publicado: como no site, só descrição, endereço e valor mudam
  const [locked, setLocked] = useState(false)
  // Editando um rascunho: tudo muda, inclusive times e repetição
  const [isDraft, setIsDraft] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [groupId, setGroupId] = useState<string | null>(params.groupId ?? null)
  // Nome do grupo do evento em edição, que pode não estar entre os da lista
  const [groupName, setGroupName] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState(profile?.city ?? '')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState('0')
  const [capacity, setCapacity] = useState('20')
  const [minimum, setMinimum] = useState('2')
  const [startsAt, setStartsAt] = useState<Date | null>(defaultStart)
  const [endsAt, setEndsAt] = useState<Date | null>(null)
  const [deadline, setDeadline] = useState<Date | null>(() => new Date(defaultStart().getTime() - 2 * 60 * 60 * 1000))
  const [exempt, setExempt] = useState(true)
  const [notifyGroup, setNotifyGroup] = useState(true)
  const [notifySignup, setNotifySignup] = useState(true)
  const [postMsgEnabled, setPostMsgEnabled] = useState(false)
  const [postMsgText, setPostMsgText] = useState('')
  const [postMsgImageUrl, setPostMsgImageUrl] = useState<string | null>(null)
  const [postMsgImage, setPostMsgImage] = useState<Cover | null>(null)
  const [rulesText, setRulesText] = useState('')
  const [rulesRequired, setRulesRequired] = useState(false)
  // Só quem criou o evento vê o toggle de aviso de nova inscrição — ao criar
  // ou duplicar, é sempre a própria pessoa; ao editar, confere o organizer_id
  const [isOrganizer, setIsOrganizer] = useState(true)
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC')
  const [cancelPolicy, setCancelPolicy] = useState<number | null>(24)
  const [recurrence, setRecurrence] = useState<(typeof RECURRENCES)[number]['value']>('none')
  const [recurrenceCount, setRecurrenceCount] = useState(4)
  const [teams, setTeams] = useState<Team[]>([])
  // Capa já salva (na edição) e a escolhida agora, enviada depois de salvar
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [cover, setCover] = useState<Cover | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null)
  // Times e repetição: ao criar, ao duplicar e num rascunho
  const editingDraft = mode === 'edit' && isDraft
  const canShape = mode !== 'edit' || editingDraft

  useEffect(() => {
    // Grupos em que a pessoa pode criar eventos (dona ou gestora): o evento
    // pode ser de um deles ou avulso
    supabase
      .from('group_members')
      .select('groups(id, name)')
      .eq('user_id', session!.user.id)
      .in('role', ['OWNER', 'MANAGER'])
      .then(({ data }) => setGroups((data ?? []).flatMap((row) => (row.groups ? [row.groups] : []))))

    if (mode === 'create' || !params.eventId) return
    supabase
      .from('events')
      .select(
        'organizer_id, title, description, address, city, category, price, cover_url, capacity, min_participants, starts_at, ends_at, registration_deadline, organizer_exempt, notify_group_on_create, notify_organizer_on_signup, post_signup_message_enabled, post_signup_message, post_signup_message_image_url, custom_rules, rules_confirmation_required, visibility, cancel_before_hours, status, group_id, recurrence_rule, groups(name), event_teams(name, capacity, position)'
      )
      .eq('id', params.eventId)
      .maybeSingle()
      .then(async ({ data }) => {
        if (data) {
          setTitle(data.title)
          setDescription(data.description ?? '')
          setAddress(data.address)
          setCity(data.city)
          setCategory(data.category ?? '')
          setPrice((data.price / 100).toFixed(2).replace('.', ','))
          setCapacity(String(data.capacity))
          setMinimum(String(data.min_participants))
          setExempt(data.organizer_exempt)
          setVisibility(data.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC')
          setCancelPolicy(data.cancel_before_hours)
          setGroupId(data.group_id)
          setGroupName(data.groups?.name ?? null)
          setTeams(
            [...(data.event_teams ?? [])]
              .sort((a, b) => a.position - b.position)
              .map((team) => ({ name: team.name, capacity: String(team.capacity) }))
          )
          // Mensagem pós-inscrição: duplicar copia a configuração inteira,
          // texto incluído, mesmo sem mostrar o campo fora do modo de edição
          setPostMsgEnabled(data.post_signup_message_enabled)
          setPostMsgText(data.post_signup_message ?? '')
          setPostMsgImageUrl(data.post_signup_message_image_url)
          setRulesText(data.custom_rules ?? '')
          setRulesRequired(data.rules_confirmation_required ?? false)
          // Duplicar também mostra a capa de origem: se a pessoa não trocar,
          // o servidor copia o arquivo pro novo evento (ver duplicate_from)
          if (mode === 'duplicate') setCoverUrl(data.cover_url)
          if (mode === 'edit') {
            setStartsAt(new Date(data.starts_at))
            setEndsAt(data.ends_at ? new Date(data.ends_at) : null)
            setDeadline(data.registration_deadline ? new Date(data.registration_deadline) : null)
            setCoverUrl(data.cover_url)
            setLocked(data.status !== 'DRAFT')
            setIsDraft(data.status === 'DRAFT')
            setNotifyGroup(data.notify_group_on_create)
            setNotifySignup(data.notify_organizer_on_signup)
            setIsOrganizer(data.organizer_id === session!.user.id)
            // Rascunho de série: a repetição volta como foi salva
            if (data.status === 'DRAFT' && data.recurrence_rule) {
              const { count } = await supabase
                .from('events')
                .select('id', { count: 'exact', head: true })
                .eq('parent_event_id', params.eventId!)
                .eq('status', 'DRAFT')
              setRecurrence(recurrenceFromRule(data.recurrence_rule))
              if (count) setRecurrenceCount(Math.max(2, count))
            }
          }
        }
        setLoading(false)
      })
  }, [mode, params.eventId, session])

  // O prazo de inscrição acompanha o início (2h antes), como sugestão
  function changeStart(value: Date | null) {
    setStartsAt(value)
    if (value) setDeadline(new Date(value.getTime() - 2 * 60 * 60 * 1000))
  }

  async function pickCover() {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      // a capa vai até 1MB no servidor
      quality: 0.4,
      base64: true,
    })
    if (picked.canceled || !picked.assets[0].base64) return
    const asset = picked.assets[0]
    setCover({ uri: asset.uri, base64: asset.base64!, mimeType: asset.mimeType ?? 'image/jpeg' })
  }

  // O evento já está salvo; se a capa falhar, ela pode ser trocada no painel
  async function uploadCover(eventId: string | null) {
    if (!cover || !eventId) return
    const result = await runAction('uploadEventCover', eventId, { base64: cover.base64, mimeType: cover.mimeType })
    if ('error' in result) {
      Alert.alert('Evento salvo, mas a capa não foi enviada', `${result.error} Tente de novo em Gerenciar evento > Capa.`)
    }
  }

  async function pickPostMsgImage() {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.4,
      base64: true,
    })
    if (picked.canceled || !picked.assets[0].base64) return
    const asset = picked.assets[0]
    setPostMsgImage({ uri: asset.uri, base64: asset.base64!, mimeType: asset.mimeType ?? 'image/jpeg' })
  }

  async function uploadPostMsgImage(eventId: string | null) {
    if (!postMsgImage || !eventId) return
    const result = await runAction('uploadPostSignupMessageImage', eventId, {
      base64: postMsgImage.base64,
      mimeType: postMsgImage.mimeType,
    })
    if ('error' in result) {
      Alert.alert('Evento salvo, mas a imagem do popup não foi enviada', `${result.error} Tente de novo na edição do evento.`)
    }
  }

  // Mesmas regras do site (src/features/eventos/schemas.ts); o servidor confere de novo
  function validate(): string | null {
    if (title.trim().length < 3 || title.trim().length > 40) return 'O título precisa ter de 3 a 40 caracteres.'
    if (address.trim().length < 5) return 'Informe o endereço completo.'
    if (city.trim().length < 2) return 'Informe a cidade.'
    if (!/^\d+([.,]\d{1,2})?$/.test(price.trim())) return 'Valor inválido.'
    const cap = Number(capacity)
    const min = Number(minimum)
    if (!Number.isInteger(cap) || cap < 2) return 'A capacidade mínima é de 2 pessoas.'
    if (!Number.isInteger(min) || min < 1) return 'O mínimo de participantes é 1.'
    if (min > cap) return 'O mínimo não pode ser maior que a capacidade.'
    if (!startsAt || startsAt <= new Date()) return 'A data de início precisa ser no futuro.'
    if (deadline && deadline >= startsAt) return 'O prazo de inscrição precisa ser antes do início.'
    if (!endsAt) return 'Informe o horário de término.'
    if (endsAt <= startsAt) return 'O término precisa ser depois do início.'
    if (canShape && teams.length > 0) {
      if (teams.some((team) => !team.name.trim() || !(Number(team.capacity) >= 1))) return 'Cada time precisa de nome e vagas.'
      const names = new Set(teams.map((team) => team.name.trim().toLowerCase()))
      if (names.size < teams.length) return 'Os times precisam ter nomes diferentes.'
    }
    if (rulesRequired && !rulesText.trim()) return 'Escreva as regras antes de exigir a confirmação de leitura.'
    return null
  }

  // Muda o número de times mantendo o que já foi preenchido nos primeiros
  function changeTeamCount(key: string | null) {
    const count = Number(key ?? 0)
    if (count < 2) {
      setTeams([])
      return
    }
    const perTeam = String(Math.max(1, Math.floor(Number(capacity) / count) || 1))
    setTeams(Array.from({ length: count }, (_, i) => teams[i] ?? { name: teamName(i), capacity: perTeam }))
  }

  // asDraft: salva sem publicar (só você vê, em Meus eventos > Rascunhos)
  async function handleSubmit(asDraft: boolean) {
    const invalid = validate()
    if (invalid) {
      setError(invalid)
      return
    }
    setSaving(asDraft ? 'draft' : 'publish')
    setError(null)
    const data = {
      title: title.trim(),
      description: description.trim(),
      address: address.trim(),
      city: city.trim(),
      category,
      price: price.trim(),
      capacity: Number(capacity),
      min_participants: Number(minimum),
      starts_at: startsAt!.toISOString(),
      ends_at: endsAt!.toISOString(),
      registration_deadline: deadline ? deadline.toISOString() : '',
      organizer_exempt: exempt,
      notify_group_on_create: notifyGroup,
      notify_organizer_on_signup: notifySignup,
      post_signup_message_enabled: postMsgEnabled,
      post_signup_message: postMsgText.trim(),
      custom_rules: rulesText.trim(),
      rules_confirmation_required: rulesRequired,
      ...(groupId ? { group_id: groupId } : {}),
      recurrence: canShape ? recurrence : 'none',
      recurrence_count: recurrenceCount,
      use_teams: canShape && teams.length >= 2,
      teams: teams.map((team) => ({ name: team.name.trim(), capacity: Number(team.capacity) })),
      visibility,
      cancel_before_hours: cancelPolicy,
      ...(mode === 'edit' ? (editingDraft ? { draft_series: true } : {}) : { as_draft: asDraft }),
      // Pede ao servidor pra copiar a capa de origem (duplicateEventCover em
      // features/eventos/actions.ts); some se a pessoa escolher outra capa
      ...(mode === 'duplicate' ? { duplicate_from: params.eventId } : {}),
    }
    const result = mode === 'edit' ? await runAction('updateEvent', params.eventId, data) : await runAction('createEvent', data)
    if (!('redirect' in result)) {
      setSaving(null)
      setError('error' in result ? result.error : 'Não foi possível salvar o evento.')
      return
    }

    const eventId = mode === 'edit' ? params.eventId! : await eventIdFrom(result.redirect)
    await uploadCover(eventId)
    await uploadPostMsgImage(eventId)

    // Rascunho editado e publicado de uma vez
    if (editingDraft && !asDraft) {
      const published = await runAction('publishEvent', params.eventId)
      if ('error' in published) {
        setSaving(null)
        setError(published.error)
        return
      }
      openEvent(eventId)
      return
    }

    // Rascunho salvo: volta para Meus eventos, onde ficam os rascunhos
    if (asDraft) {
      router.dismissTo({ pathname: '/events', params: { tab: 'mine' } })
      return
    }

    // A edição volta para onde foi aberta (o painel do organizador); evento novo abre a página dele
    if (mode === 'edit') router.back()
    else openEvent(eventId)
  }

  const titleText = editingDraft
    ? 'Editar rascunho'
    : mode === 'edit'
      ? 'Editar evento'
      : mode === 'duplicate'
        ? 'Duplicar evento'
        : 'Criar evento'

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: titleText }} />
        <ActivityIndicator style={styles.flex} color={colors.primary} />
      </Screen>
    )
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: titleText }} />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: 20 + headerInset }]}>
          {locked && (
            <Text style={styles.warning}>
              Este evento já está publicado. Apenas a descrição, o endereço e o valor podem ser editados.
            </Text>
          )}

          {/* Primeira escolha: em qual grupo o evento fica, ou avulso */}
          <Section title="Onde criar">
            <Dropdown
              testID="form-group"
              placeholder="Grupo"
              allLabel="Evento avulso (sem grupo)"
              options={groups.map((group) => ({ key: group.id, label: group.name }))}
              selected={groupId}
              selectedLabel={
                !groupId
                  ? 'Evento avulso (sem grupo)'
                  : !groups.some((group) => group.id === groupId)
                    ? (groupName ?? undefined)
                    : undefined
              }
              onSelect={setGroupId}
              disabled={mode === 'edit'}
            />
            <Text style={styles.hint}>
              {mode === 'edit'
                ? 'O grupo não muda depois de criado.'
                : groupId
                  ? 'Os membros do grupo são avisados quando o evento for publicado.'
                  : 'Fica fora de qualquer grupo. Na lista aparecem os grupos em que você é dono ou gestor.'}
            </Text>
          </Section>

          <Section title="Foto de capa">
            <Pressable
              testID="form-cover"
              accessibilityRole="button"
              accessibilityLabel={cover || coverUrl ? 'Trocar foto de capa' : 'Adicionar foto de capa'}
              onPress={pickCover}
              disabled={saving !== null}>
              {cover || coverUrl ? (
                <View>
                  <Image source={cover?.uri ?? coverUrl} style={styles.cover} contentFit="cover" />
                  <View style={styles.coverBadge}>
                    <ImagePlus size={14} color="#FFFFFF" />
                    <Text style={styles.coverBadgeText}>Trocar</Text>
                  </View>
                </View>
              ) : (
                <View style={[styles.cover, styles.coverEmpty]}>
                  <ImagePlus size={26} color={colors.primary} />
                  <Text style={styles.coverText}>Adicionar foto de capa</Text>
                  <Text style={styles.hint}>Opcional. Aparece no topo do evento.</Text>
                </View>
              )}
            </Pressable>
            <Text style={styles.hint}>
              Tamanho ideal: 1600 × 900 pixels, até 1 MB. Cada tela recorta a capa de um jeito: deixe textos, logos e
              rostos no centro da imagem, longe das bordas de cima e de baixo, para não serem cortados.
            </Text>
            {cover && recurrence !== 'none' && canShape && (
              <Text style={styles.hint}>A mesma capa vale para todos os eventos da série.</Text>
            )}
          </Section>

          <Section title="Informações básicas">
            <Field
              testID="form-title"
              label="Título"
              placeholder="Ex.: Futebol de quinta"
              value={title}
              onChangeText={setTitle}
              maxLength={40}
              editable={!locked}
            />
            <Field
              testID="form-description"
              label="Descrição (opcional)"
              placeholder="O que levar, como chegar, regras da casa"
              value={description}
              onChangeText={setDescription}
              maxLength={2000}
              multiline
              style={styles.multiline}
            />
            <Text style={styles.label}>Categoria</Text>
            <Dropdown
              testID="form-category"
              placeholder="Escolha a categoria"
              allLabel="Sem categoria"
              options={CATEGORIES.map((item) => ({ key: item, label: item }))}
              selected={category || null}
              onSelect={(value) => setCategory(value ?? '')}
              disabled={locked}
            />
          </Section>

          <Section title="Local">
            <Field
              testID="form-address"
              label="Endereço"
              placeholder="Rua, número e bairro"
              value={address}
              onChangeText={setAddress}
              maxLength={300}
            />
            <Field
              testID="form-city"
              label="Cidade"
              autoCapitalize="words"
              value={city}
              onChangeText={setCity}
              maxLength={100}
              editable={!locked}
            />
          </Section>

          <Section title="Data e prazo">
            {locked ? (
              <Text style={styles.detail}>As datas de um evento publicado não mudam.</Text>
            ) : (
              <>
                <DateTimeField testID="form-starts" label="Início" value={startsAt} onChange={changeStart} />
                <DateTimeField testID="form-ends" label="Término" value={endsAt} onChange={setEndsAt} />
                <DateTimeField
                  testID="form-deadline"
                  label="Inscrições até (opcional)"
                  value={deadline}
                  onChange={setDeadline}
                  optional
                />
                <Text style={styles.detail}>
                  Em branco, as inscrições ficam abertas até o início do evento. Se o mínimo de participantes não for
                  atingido até 12h antes do início, o evento é cancelado automaticamente e todos são reembolsados.
                </Text>
              </>
            )}
            {canShape && (
              <>
                <Text style={styles.label}>Repetição</Text>
                <Chips
                  items={RECURRENCES.map((item) => ({ value: item.value, label: item.label }))}
                  selected={recurrence}
                  onSelect={(value) => setRecurrence(value as typeof recurrence)}
                  testPrefix="form-recurrence"
                />
                {recurrence !== 'none' && (
                  <Stepper label="Quantos eventos criar" value={recurrenceCount} min={2} max={52} onChange={setRecurrenceCount} />
                )}
              </>
            )}
          </Section>

          <Section title="Vagas e valor">
            <Field
              testID="form-price"
              label="Valor por pessoa (R$, 0 = gratuito)"
              keyboardType="decimal-pad"
              value={price}
              onChangeText={setPrice}
            />
            {(() => {
              const cents = Math.round(parseFloat(price.replace(',', '.')) * 100)
              if (isNaN(cents) || cents <= 0) return null
              const fee = Math.round(cents * 0.0599)
              const net = cents - fee
              return (
                <Text style={styles.feeHint}>
                  Taxa plataforma (5,99%): {formatMoney(fee)} · Você recebe: {formatMoney(net)}
                </Text>
              )
            })()}
            <View style={styles.pair}>
              <View style={styles.flex}>
                <Field
                  testID="form-capacity"
                  label="Capacidade *"
                  keyboardType="number-pad"
                  value={capacity}
                  onChangeText={setCapacity}
                  editable={!locked}
                />
              </View>
              <View style={styles.flex}>
                <Field
                  testID="form-minimum"
                  label="Mínimo *"
                  keyboardType="number-pad"
                  value={minimum}
                  onChangeText={setMinimum}
                  editable={!locked}
                />
              </View>
            </View>
            <Text style={styles.hint}>A fila de espera é calculada automaticamente: 10% da capacidade (mínimo 1 vaga).</Text>
            <ToggleRow
              testID="form-exempt"
              title="Organizador isento"
              detail="Você participa sem pagar a inscrição"
              value={exempt}
              onChange={setExempt}
              disabled={locked}
            />
            {groupId && (
              <ToggleRow
                testID="form-notify-group"
                title="Notificar o grupo"
                detail="Avisa o grupo quando este evento for publicado"
                value={notifyGroup}
                onChange={setNotifyGroup}
              />
            )}
            {isOrganizer && (
              <ToggleRow
                testID="form-notify-signup"
                title="Notificar novas inscrições"
                detail="Avisa você a cada nova inscrição confirmada"
                value={notifySignup}
                onChange={setNotifySignup}
              />
            )}
            {/* Só depois que o evento existe: ativa quando quiser, na edição */}
            {mode === 'edit' && (
              <>
                <ToggleRow
                  testID="form-notify-postsignup"
                  title="Mostrar mensagem após a inscrição"
                  detail="Aparece pra quem acabou de confirmar: regras, como chegar, avisos etc."
                  value={postMsgEnabled}
                  onChange={setPostMsgEnabled}
                />
                {postMsgEnabled && (
                  <Field
                    testID="form-postsignup-message"
                    label={`Mensagem (${postMsgText.length}/500)`}
                    placeholder="Ex: Chegue 15 min antes. Estacionamento na rua ao lado."
                    value={postMsgText}
                    onChangeText={setPostMsgText}
                    maxLength={500}
                    multiline
                    style={styles.multiline}
                  />
                )}
                {postMsgEnabled && (
                  <>
                    <Text style={styles.label}>Ou personalize com uma imagem</Text>
                    <Pressable
                      testID="form-postsignup-image"
                      accessibilityRole="button"
                      accessibilityLabel={postMsgImage || postMsgImageUrl ? 'Trocar imagem do popup' : 'Adicionar imagem do popup'}
                      onPress={pickPostMsgImage}>
                      {postMsgImage || postMsgImageUrl ? (
                        <View>
                          <Image source={postMsgImage?.uri ?? postMsgImageUrl} style={styles.cover} contentFit="cover" />
                          <View style={styles.coverBadge}>
                            <ImagePlus size={14} color="#FFFFFF" />
                            <Text style={styles.coverBadgeText}>Trocar</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.cover, styles.coverEmpty]}>
                          <ImagePlus size={22} color={colors.primary} />
                          <Text style={styles.coverText}>Adicionar imagem (opcional)</Text>
                        </View>
                      )}
                    </Pressable>
                  </>
                )}
              </>
            )}
          </Section>

          <Section title="Regras e diretrizes">
            <Field
              testID="form-rules"
              label={`Regras personalizadas (opcional) (${rulesText.length}/8000)`}
              placeholder={'Ex:\n• Chegue com 15 minutos de antecedência\n• Traje esportivo obrigatório'}
              value={rulesText}
              onChangeText={setRulesText}
              maxLength={8000}
              multiline
              style={styles.multiline}
            />
            <Text style={styles.hint}>
              Se preenchido, substitui o texto padrão na aba Regras. Em branco, mantém o padrão.
            </Text>
            <ToggleRow
              testID="form-rules-required"
              title="Exigir confirmação de leitura"
              detail="Participante só consegue se inscrever depois de marcar que leu e concorda"
              value={rulesRequired}
              onChange={setRulesRequired}
            />
          </Section>

          {canShape && (
            <Section title="Times">
              <Text style={styles.detail}>Cada pessoa escolhe o time ao se inscrever.</Text>
              <Dropdown
                testID="form-team-count"
                placeholder="Sem times"
                allLabel="Sem times"
                hideAll
                options={TEAM_COUNTS}
                selected={teams.length >= 2 ? String(teams.length) : '0'}
                onSelect={changeTeamCount}
              />
              {teams.map((team, index) => (
                <View key={index} style={styles.team}>
                  <View style={styles.flex}>
                    <Field
                      testID={`form-team-name-${index}`}
                      label={`Time ${index + 1}`}
                      value={team.name}
                      onChangeText={(name) => setTeams(teams.map((item, i) => (i === index ? { ...item, name } : item)))}
                      maxLength={50}
                    />
                  </View>
                  <View style={styles.teamCapacity}>
                    <Field
                      testID={`form-team-capacity-${index}`}
                      label="Vagas"
                      keyboardType="number-pad"
                      value={team.capacity}
                      onChangeText={(value) =>
                        setTeams(teams.map((item, i) => (i === index ? { ...item, capacity: value } : item)))
                      }
                    />
                  </View>
                </View>
              ))}
            </Section>
          )}

          <Section title="Quem participa">
            <Text style={styles.label}>Visibilidade</Text>
            <Chips
              items={[
                { value: 'PUBLIC', label: 'Público' },
                { value: 'PRIVATE', label: 'Privado (com aprovação)' },
              ]}
              selected={visibility}
              onSelect={(value) => setVisibility(value as 'PUBLIC' | 'PRIVATE')}
              testPrefix="form-visibility"
            />
            <Text style={styles.label}>Cancelamento pelo participante</Text>
            <Chips
              items={CANCEL_POLICIES.map((item) => ({ value: String(item.value), label: item.label }))}
              selected={String(cancelPolicy)}
              onSelect={(value) => setCancelPolicy(value === 'null' ? null : Number(value))}
              testPrefix="form-cancel"
            />
          </Section>
        </ScrollView>
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {/* Junto do botão: no fim do formulário, o teclado escondia o erro */}
          {error && (
            <Text testID="form-error" style={styles.error}>
              {error}
            </Text>
          )}
          {mode === 'edit' && !editingDraft ? (
            <Button testID="form-submit" label="Salvar alterações" onPress={() => handleSubmit(false)} loading={saving !== null} />
          ) : (
            <View style={styles.pair}>
              <Pressable
                testID="form-save-draft"
                accessibilityRole="button"
                onPress={() => handleSubmit(true)}
                disabled={saving !== null}
                style={({ pressed }) => [styles.draftButton, (pressed || saving !== null) && styles.dim]}>
                {saving === 'draft' ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={styles.draftText}>Salvar rascunho</Text>
                )}
              </Pressable>
              <Button
                testID="form-submit"
                label="Publicar evento"
                onPress={() => handleSubmit(false)}
                loading={saving === 'publish'}
                disabled={saving !== null}
                style={styles.flex}
              />
            </View>
          )}
        </View>
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

function Chips(props: {
  items: { value: string; label: string }[]
  selected: string
  onSelect: (value: string) => void
  testPrefix: string
}) {
  return (
    <View style={styles.chips}>
      {props.items.map((item, index) => {
        const selected = item.value === props.selected
        return (
          <Pressable
            key={item.value || 'none'}
            testID={`${props.testPrefix}-${index}`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => props.onSelect(item.value)}
            style={[styles.chip, selected && styles.chipSelected]}>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function ToggleRow(props: {
  testID: string
  title: string
  detail: string
  value: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <View style={styles.toggle}>
      <View style={styles.flex}>
        <Text style={styles.toggleTitle}>{props.title}</Text>
        <Text style={styles.detail}>{props.detail}</Text>
      </View>
      <Switch
        testID={props.testID}
        value={props.value}
        onValueChange={props.onChange}
        disabled={props.disabled}
        trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.15)' }}
        thumbColor="#FFFFFF"
        accessibilityLabel={props.title}
      />
    </View>
  )
}

function Stepper(props: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.toggle}>
      <Text style={[styles.toggleTitle, styles.flex]}>{props.label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Menos"
        onPress={() => props.onChange(Math.max(props.min, props.value - 1))}
        style={styles.stepButton}>
        <Minus size={16} color={colors.foreground} />
      </Pressable>
      <Text style={styles.stepValue}>{props.value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mais"
        onPress={() => props.onChange(Math.min(props.max, props.value + 1))}
        style={styles.stepButton}>
        <Plus size={16} color={colors.foreground} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 24 },
  warning: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.warning,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.25)',
    backgroundColor: 'rgba(250,204,21,0.05)',
  },
  section: { padding: 16, gap: 14 },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 16, color: colors.text },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: 'rgba(74,222,128,0.7)' },
  hint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.text40 },
  feeHint: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, color: colors.text35, marginTop: -8 },
  detail: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.text50 },
  multiline: { height: 100, paddingTop: 14, textAlignVertical: 'top', borderRadius: radius.card },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  chipSelected: { borderColor: 'rgba(74,222,128,0.45)', backgroundColor: 'rgba(74,222,128,0.1)' },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text70 },
  chipTextSelected: { color: colors.primary },
  pair: { flexDirection: 'row', gap: 12 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepValue: { minWidth: 28, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  team: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  teamCapacity: { width: 90 },
  draftButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.3)',
    backgroundColor: 'rgba(74,222,128,0.08)',
  },
  draftText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },
  dim: { opacity: 0.6 },
  cover: { height: 170, borderRadius: 14, backgroundColor: colors.input },
  coverEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(74,222,128,0.35)',
  },
  coverText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },
  coverBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  coverBadgeText: { fontFamily: fonts.bodySemi, fontSize: 12, color: '#FFFFFF' },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.destructive, textAlign: 'center' },
  bar: {
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
})
