'use server'

import { redirect } from 'next/navigation'
import { createNotificationAdmin } from '@/features/notificacoes/actions'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'
import { formatPrice } from '@/utils/format'
import { sendEventCancelledToParticipant } from '@/lib/emails'
import { refundParticipationPayments, releaseCouponUse } from '@/lib/refunds'
import { changeWaitlistTeam } from '@/features/fila/waitlist'
import type { EventSchema } from './schemas'
import { requestEventJoin } from './engagement'
import { changeTeam } from './teams'
import { minCheckAt } from './min-check'

// Preço em string "R$ xx,xx" → centavos
function parsePriceToCents(price: string): number {
  return Math.round(parseFloat(price.replace(',', '.')) * 100)
}

// Calcula waitlist_capacity: MAX(1, CEIL(capacity * 0.10))
function calcWaitlistCapacity(capacity: number): number {
  return Math.max(1, Math.ceil(capacity * 0.1))
}

// DDMMAA a partir da data/hora de início, para compor o slug (ex.: 11/10/26 → "111026")
function eventDateSuffix(startsAt: string | Date): string {
  const d = new Date(startsAt)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear() % 100).padStart(2, '0')
  return `${dd}${mm}${yy}`
}

// Confere a unicidade com o service_role: pelo cliente do usuário a RLS esconde
// rascunhos de outros organizadores, e o slug é unique na tabela inteira.
// `taken` cobre slugs já reservados neste mesmo lote e ainda não inseridos.
async function generateUniqueEventSlug(
  title: string,
  startsAt: string | Date,
  excludeId?: string,
  taken?: Set<string>
): Promise<string> {
  const admin = createAdminClient()
  const base = `${slugify(title) || 'evento'}-${eventDateSuffix(startsAt)}`
  let candidate = base
  let suffix = 2
  while (true) {
    if (!taken?.has(candidate)) {
      let q = admin.from('events').select('id').eq('slug', candidate)
      if (excludeId) q = q.neq('id', excludeId)
      const { data } = await q.maybeSingle()
      if (!data) return candidate
    }
    candidate = `${base}-${suffix++}`
  }
}

// Times do evento conforme o formulário: com use_teams e ao menos 2 times,
// grava esses; senão o evento fica sem times. Só para eventos sem inscrições
// (criação e rascunho), porque as inscrições apontam para os times.
async function replaceEventTeams(eventId: string, data: Pick<EventSchema, 'use_teams' | 'teams'>) {
  const admin = createAdminClient()
  await admin.from('event_teams').delete().eq('event_id', eventId)
  if (!data.use_teams || !data.teams || data.teams.length < 2) return
  const { error } = await admin.from('event_teams').insert(
    data.teams.map((t, i) => ({ event_id: eventId, name: t.name, capacity: t.capacity, position: i }))
  )
  if (error) console.error('[EVENT] teams insert error:', eventId, error)
}

// Cria os eventos seguintes de uma série recorrente a partir do principal
async function createRecurringChildren(
  parentId: string,
  organizerId: string,
  data: EventSchema,
  status: 'DRAFT' | 'OPEN'
) {
  if (!data.recurrence || data.recurrence === 'none') return
  const freqDays = data.recurrence === 'weekly' ? 7 : data.recurrence === 'biweekly' ? 14 : 30
  const rrule = data.recurrence === 'weekly'
    ? 'FREQ=WEEKLY'
    : data.recurrence === 'biweekly'
      ? 'FREQ=WEEKLY;INTERVAL=2'
      : 'FREQ=MONTHLY'

  const admin = createAdminClient()
  const count = Math.min(data.recurrence_count ?? 4, 52)
  const startsAt = new Date(data.starts_at)
  const endsAt = data.ends_at ? new Date(data.ends_at) : null
  const deadline = new Date(data.registration_deadline)
  const durationMs = endsAt ? endsAt.getTime() - startsAt.getTime() : 0
  const deadlineOffsetMs = deadline.getTime() - startsAt.getTime()

  const children = []
  const takenSlugs = new Set<string>()
  for (let i = 1; i <= count; i++) {
    const offsetDays = freqDays * i
    const childStart = new Date(startsAt.getTime() + offsetDays * 86400000)
    const childEnd = endsAt ? new Date(childStart.getTime() + durationMs) : null
    const childDeadline = new Date(childStart.getTime() + deadlineOffsetMs)
    const childMinCheck = minCheckAt(childStart)
    const childSlug = await generateUniqueEventSlug(data.title, childStart, undefined, takenSlugs)
    takenSlugs.add(childSlug)

    children.push({
      group_id: data.group_id ?? null,
      organizer_id: organizerId,
      title: data.title,
      slug: childSlug,
      description: data.description || null,
      address: data.address,
      city: data.city,
      category: data.category || null,
      price: parsePriceToCents(data.price),
      capacity: data.capacity,
      min_participants: data.min_participants,
      waitlist_capacity: calcWaitlistCapacity(data.capacity),
      starts_at: childStart.toISOString(),
      ends_at: childEnd?.toISOString() ?? null,
      registration_deadline: childDeadline.toISOString(),
      min_check_at: childMinCheck.toISOString(),
      organizer_exempt: data.organizer_exempt,
      visibility: data.visibility ?? 'PUBLIC',
      cancel_before_hours: data.cancel_before_hours ?? null,
      status,
      parent_event_id: parentId,
      recurrence_rule: rrule,
      recurrence_index: i,
    })
  }

  const { data: inserted, error: childrenError } = await admin.from('events').insert(children).select('id')

  // Cada evento da série tem os mesmos times
  for (const child of inserted ?? []) await replaceEventTeams(child.id, data)

  // Also mark the parent with recurrence_rule
  await admin.from('events').update({ recurrence_rule: rrule }).eq('id', parentId)

  // O evento principal já existe: quem chama segue o fluxo em vez de devolver
  // erro, o que levaria o organizador a criá-lo de novo
  if (childrenError) console.error('[EVENT] recurrence insert error:', parentId, childrenError)
}

// Avisa os membros do grupo (menos o organizador) de um evento novo publicado
async function notifyGroupNewEvent(params: {
  groupId: string
  organizerId: string
  event: { id: string; slug: string | null; title: string; starts_at: string; city: string }
}) {
  const { groupId, organizerId, event } = params
  const adminClient = createAdminClient()
  const { data: members } = await adminClient
    .from('group_members')
    .select('user_id, profiles(full_name, notif_new_event_channel)')
    .eq('group_id', groupId)
    .neq('user_id', organizerId)

  if (!members || members.length === 0) return

  const { createNotificationAdmin } = await import('@/features/notificacoes/actions')
  await Promise.all(
    members.map((m) =>
      createNotificationAdmin({
        userId: m.user_id,
        type: 'NEW_EVENT',
        title: 'Novo evento no grupo',
        body: event.title,
        data: { event_id: event.id },
      })
    )
  )

  // E-mail para quem prefere ser avisado por e-mail (WhatsApp ainda não está disponível)
  const { sendNewEventToGroupMember } = await import('@/lib/emails')
  const emailMembers = members.filter((m) => ((m.profiles as any)?.notif_new_event_channel ?? 'EMAIL') === 'EMAIL')
  await Promise.allSettled(
    emailMembers.map(async (m) => {
      const { data: authUser } = await adminClient.auth.admin.getUserById(m.user_id)
      if (!authUser?.user?.email) return
      await sendNewEventToGroupMember({
        to: authUser.user.email,
        name: (m.profiles as any)?.full_name ?? 'Participante',
        eventTitle: event.title,
        eventDate: event.starts_at,
        eventCity: event.city,
        eventId: event.slug ?? event.id,
      })
    })
  )
}

export async function createEventAction(data: EventSchema) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  // Verificar que é membro do grupo (eventos avulsos, sem grupo, pulam essa checagem)
  if (data.group_id) {
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', data.group_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) return { error: 'Você precisa ser membro do grupo para criar eventos.' }
  }

  const starts_at = new Date(data.starts_at)
  const min_check_at = minCheckAt(starts_at)

  const slug = await generateUniqueEventSlug(data.title, data.starts_at)

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      group_id: data.group_id ?? null,
      organizer_id: user.id,
      title: data.title,
      slug,
      description: data.description || null,
      address: data.address,
      city: data.city,
      category: data.category || null,
      price: parsePriceToCents(data.price),
      capacity: data.capacity,
      min_participants: data.min_participants,
      waitlist_capacity: calcWaitlistCapacity(data.capacity),
      starts_at: data.starts_at,
      ends_at: data.ends_at || null,
      registration_deadline: data.registration_deadline,
      min_check_at: min_check_at.toISOString(),
      organizer_exempt: data.organizer_exempt,
      visibility: data.visibility ?? 'PUBLIC',
      cancel_before_hours: data.cancel_before_hours ?? null,
      status: data.as_draft ? 'DRAFT' : 'OPEN',
    })
    .select('id, slug')
    .single()

  if (error || !event) return { error: 'Erro ao criar evento.' }

  await replaceEventTeams(event.id, data)

  // Eventos seguintes da série recorrente, no mesmo estado do principal
  await createRecurringChildren(event.id, user.id, data, data.as_draft ? 'DRAFT' : 'OPEN')

  // Rascunho não avisa ninguém: o aviso sai quando for publicado
  if (!data.as_draft && data.group_id) {
    await notifyGroupNewEvent({
      groupId: data.group_id,
      organizerId: user.id,
      event: { id: event.id, slug: event.slug, title: data.title, starts_at: data.starts_at, city: data.city },
    })
  }

  revalidatePath('/eventos')
  redirect(`/eventos/${event.slug ?? event.id}`)
}

export async function updateEventAction(eventId: string, data: EventSchema) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  // Verificar que é o organizador
  const { data: event } = await supabase
    .from('events')
    .select('status, organizer_id')
    .eq('id', eventId)
    .single()

  if (!event || event.organizer_id !== user.id) return { error: 'Sem permissão.' }

  const admin = createAdminClient()

  // Busca participantes confirmados para notificar
  async function notifyParticipants(title: string, body: string) {
    const { data: parts } = await admin
      .from('participations')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('status', 'CONFIRMED')
    if (!parts?.length) return
    const { createNotificationAdmin } = await import('@/features/notificacoes/actions')
    await Promise.all(parts.map((p) =>
      createNotificationAdmin({
        userId: p.user_id,
        type: 'EVENT_UPDATED',
        title,
        body,
        data: { event_id: eventId },
      })
    ))
  }

  // Campos críticos (preço, capacidade, data) só são editáveis em DRAFT
  const isCriticalLocked = event.status !== 'DRAFT'
  if (isCriticalLocked) {
    const { data: current } = await supabase
      .from('events')
      .select('title, description, address, slug, starts_at, price')
      .eq('id', eventId)
      .single()

    const newSlug = current?.title !== data.title
      ? await generateUniqueEventSlug(data.title, current!.starts_at, eventId)
      : (current?.slug ?? await generateUniqueEventSlug(data.title, current!.starts_at, eventId))

    const newPrice = parsePriceToCents(data.price)

    const { error } = await supabase
      .from('events')
      .update({ description: data.description || null, address: data.address, visibility: data.visibility ?? 'PUBLIC', cancel_before_hours: data.cancel_before_hours ?? null, slug: newSlug, price: newPrice })
      .eq('id', eventId)
    if (error) return { error: 'Erro ao atualizar evento.' }

    // Notifica só se o endereço ou o valor mudou
    if (current && data.address !== current.address) {
      await notifyParticipants(
        'Endereço do evento alterado',
        `O local de "${current.title}" foi atualizado para: ${data.address}`
      )
    }
    if (current && newPrice !== current.price) {
      await notifyParticipants(
        'Valor do evento alterado',
        `O valor de inscrição de "${current.title}" foi atualizado para ${formatPrice(newPrice)}.`
      )

      // Recalcula o desconto dos cupons do evento a partir do percentual
      // salvo, para que um cupom de 20%/40%/100% continue nesse mesmo
      // percentual do novo preço.
      const { data: eventCoupons } = await admin
        .from('coupons')
        .select('id, percent_off')
        .eq('event_id', eventId)
        .eq('active', true)
        .not('percent_off', 'is', null)

      if (eventCoupons && eventCoupons.length > 0) {
        await Promise.all(
          eventCoupons.map((c) =>
            admin
              .from('coupons')
              .update({ amount_cents: Math.round(newPrice * ((c.percent_off as number) / 100)) })
              .eq('id', c.id)
          )
        )
      }
    }

    revalidatePath(`/eventos/${newSlug}`)
    redirect(`/eventos/${newSlug}`)
  }

  const starts_at = new Date(data.starts_at)
  const min_check_at = minCheckAt(starts_at)

  // Busca valores anteriores para detectar mudanças relevantes
  const { data: current } = await supabase
    .from('events')
    .select('title, starts_at, address, slug')
    .eq('id', eventId)
    .single()

  const titleOrDateChanged = current?.title !== data.title ||
    (current?.starts_at && eventDateSuffix(current.starts_at) !== eventDateSuffix(data.starts_at))
  const updatedSlug = titleOrDateChanged
    ? await generateUniqueEventSlug(data.title, data.starts_at, eventId)
    : (current?.slug ?? await generateUniqueEventSlug(data.title, data.starts_at, eventId))

  const { error } = await supabase
    .from('events')
    .update({
      title: data.title,
      slug: updatedSlug,
      description: data.description || null,
      address: data.address,
      city: data.city,
      category: data.category || null,
      price: parsePriceToCents(data.price),
      capacity: data.capacity,
      min_participants: data.min_participants,
      waitlist_capacity: calcWaitlistCapacity(data.capacity),
      starts_at: data.starts_at,
      ends_at: data.ends_at || null,
      registration_deadline: data.registration_deadline,
      min_check_at: min_check_at.toISOString(),
      organizer_exempt: data.organizer_exempt,
      visibility: data.visibility ?? 'PUBLIC',
      cancel_before_hours: data.cancel_before_hours ?? null,
    })
    .eq('id', eventId)

  if (error) return { error: 'Erro ao atualizar evento.' }

  // Rascunho não tem inscrições: o app manda draft_series para refazer os
  // times e a série recorrente com o que está no formulário. O formulário do
  // site não manda, e aí times e série ficam como estão.
  if (data.draft_series) {
    await replaceEventTeams(eventId, data)
    await admin.from('events').delete().eq('parent_event_id', eventId).eq('organizer_id', user.id).eq('status', 'DRAFT')
    await admin.from('events').update({ recurrence_rule: null }).eq('id', eventId)
    await createRecurringChildren(eventId, user.id, data, 'DRAFT')
  }

  if (data.publish_draft) {
    const published = await publishEventAction(eventId)
    if ('error' in published) return { error: published.error }
  }

  // Notifica participantes se data ou endereço mudaram
  if (current) {
    const dateChanged = data.starts_at !== current.starts_at
    const addressChanged = data.address !== current.address
    if (dateChanged && addressChanged) {
      await notifyParticipants(
        'Evento atualizado',
        `Data e local de "${data.title}" foram alterados. Confira os novos detalhes.`
      )
    } else if (dateChanged) {
      const newDate = new Date(data.starts_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      await notifyParticipants(
        'Data do evento alterada',
        `"${data.title}" foi reagendado para ${newDate}.`
      )
    } else if (addressChanged) {
      await notifyParticipants(
        'Local do evento alterado',
        `O endereço de "${data.title}" foi atualizado para: ${data.address}`
      )
    }
  }

  revalidatePath(`/eventos/${updatedSlug}`)
  redirect(`/eventos/${updatedSlug}`)
}

// Publica um rascunho e, se ele abre uma série recorrente, os rascunhos da série
export async function publishEventAction(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()
  const { data: event } = await admin
    .from('events')
    .select('id, slug, title, starts_at, registration_deadline, city, group_id, organizer_id, status')
    .eq('id', eventId)
    .maybeSingle()

  if (!event || event.organizer_id !== user.id) return { error: 'Evento não encontrado.' }
  if (event.status !== 'DRAFT') return { error: 'Este evento já foi publicado.' }
  // Um rascunho antigo pode ter ficado com a data no passado
  if (new Date(event.registration_deadline) <= new Date()) {
    return { error: 'O prazo de inscrição deste rascunho já passou. Edite as datas antes de publicar.' }
  }

  // status não é gravável pelo cliente do usuário (GRANT de UPDATE por coluna)
  const { error } = await admin
    .from('events')
    .update({ status: 'OPEN' })
    .eq('id', eventId)
    .eq('organizer_id', user.id)
    .eq('status', 'DRAFT')

  if (error) return { error: 'Erro ao publicar evento.' }

  // Os eventos seguintes da série, menos os que já ficaram para trás
  await admin
    .from('events')
    .update({ status: 'OPEN' })
    .eq('parent_event_id', eventId)
    .eq('organizer_id', user.id)
    .eq('status', 'DRAFT')
    .gt('registration_deadline', new Date().toISOString())

  if (event.group_id) {
    await notifyGroupNewEvent({ groupId: event.group_id, organizerId: user.id, event })
  }

  revalidatePath('/eventos')
  revalidatePath(`/eventos/${event.slug ?? eventId}`)
  return { success: true }
}

// Apaga um rascunho e os rascunhos da série que ele abre
export async function deleteDraftEventAction(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()
  const { data: event } = await admin
    .from('events')
    .select('organizer_id, status')
    .eq('id', eventId)
    .maybeSingle()

  if (!event || event.organizer_id !== user.id) return { error: 'Evento não encontrado.' }
  if (event.status !== 'DRAFT') return { error: 'Só rascunhos podem ser excluídos.' }

  await admin.from('events').delete().eq('parent_event_id', eventId).eq('organizer_id', user.id).eq('status', 'DRAFT')
  const { error } = await admin.from('events').delete().eq('id', eventId).eq('status', 'DRAFT')
  if (error) return { error: 'Erro ao excluir o rascunho.' }

  revalidatePath('/eventos')
  return { success: true }
}

export async function cancelEventAction(eventId: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: event } = await supabase
    .from('events')
    .select('status, organizer_id, title, price')
    .eq('id', eventId)
    .single()

  if (!event) return { error: 'Evento não encontrado.' }
  if (event.organizer_id !== user.id) return { error: 'Sem permissão.' }
  if (['COMPLETED', 'CANCELLED'].includes(event.status)) {
    return { error: 'Este evento não pode ser cancelado.' }
  }

  const admin = createAdminClient()

  // Buscar participantes confirmados para reembolsar
  const { data: confirmed } = await admin
    .from('participations')
    .select('id, user_id, coupon_id')
    .eq('event_id', eventId)
    .eq('status', 'CONFIRMED')

  // Cancelar o evento
  const { error } = await admin
    .from('events')
    .update({ status: 'CANCELLED' })
    .eq('id', eventId)

  if (error) return { error: 'Erro ao cancelar evento.' }

  // Reembolsar e notificar cada participante confirmado
  const { createNotificationAdmin } = await import('@/features/notificacoes/actions')
  for (const p of confirmed ?? []) {
    // Reembolso na carteira do que cada um de fato pagou
    const refundedAmount = await refundParticipationPayments(admin, {
      participationId: p.id,
      userId: p.user_id,
      eventId,
      description: `Reembolso: ${event.title}`,
    }) ?? 0
    await releaseCouponUse(admin, { couponId: p.coupon_id, userId: p.user_id, eventId })

    // Notificação in-app
    await createNotificationAdmin({
      userId: p.user_id,
      type: 'EVENT_CANCELLED',
      title: 'Evento cancelado',
      body: `"${event.title}" foi cancelado pelo organizador.${refundedAmount > 0 ? ' Seu pagamento foi estornado para a carteira.' : ''}`,
      data: { event_id: eventId },
    })

    // E-mail de cancelamento
    const [{ data: profile }, { data: authUser }] = await Promise.all([
      admin.from('profiles').select('full_name').eq('id', p.user_id).single(),
      admin.auth.admin.getUserById(p.user_id),
    ])
    if (authUser?.user?.email) {
      sendEventCancelledToParticipant({
        to: authUser.user.email,
        name: profile?.full_name ?? 'Participante',
        eventTitle: event.title,
        refundAmount: refundedAmount,
      }).catch((e) => console.error('[EMAIL] sendEventCancelledToParticipant:', e))
    }
  }

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/eventos')
  return { success: true }
}

// ── Troca de time (confirmados: máx 1 troca; fila: ilimitado) ────────────────
export async function changeTeamAction(participationId: string, newTeamId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  return changeTeam(user.id, participationId, newTeamId)
}

// ── Troca de fila de espera entre times (ilimitado) ───────────────────────────
export async function changeWaitlistTeamAction(waitlistId: string, newTeamId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  return changeWaitlistTeam(user.id, waitlistId, newTeamId)
}

export async function regenerateEventInviteAction(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.', token: null }

  const { data, error } = await supabase
    .from('events')
    .update({ invite_token: crypto.randomUUID() })
    .eq('id', eventId)
    .eq('organizer_id', user.id)
    .select('invite_token')
    .single()

  if (error || !data) return { error: 'Sem permissão.', token: null }

  revalidatePath(`/eventos/${eventId}`)
  return { token: data.invite_token as string }
}

export async function requestEventJoinAction(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  return requestEventJoin(user.id, eventId)
}

export async function approveEventJoinRequest(requestId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()
  const { data: req } = await admin
    .from('event_join_requests')
    .select('event_id, user_id')
    .eq('id', requestId)
    .maybeSingle()

  if (!req) return { error: 'Solicitação não encontrada.' }

  // Verify caller is organizer
  const { data: event } = await admin
    .from('events')
    .select('organizer_id, title, slug, price, capacity')
    .eq('id', req.event_id)
    .maybeSingle()

  if (!event || event.organizer_id !== user.id) return { error: 'Sem permissão.' }

  const { data: existing } = await admin
    .from('participations')
    .select('status, coupon_id')
    .eq('event_id', req.event_id)
    .eq('user_id', req.user_id)
    .maybeSingle()

  // Quem já tem inscrição ativa (confirmada ou aguardando pagamento) continua
  // como está, com o cupom que tiver; os demais ocupam uma vaga nova
  const alreadyRegistered = existing?.status === 'CONFIRMED' || existing?.status === 'PENDING'
  if (!alreadyRegistered) {
    const { count } = await admin
      .from('participations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', req.event_id)
      .eq('status', 'CONFIRMED')

    if ((count ?? 0) >= event.capacity) return { error: 'Evento lotado. Não há vaga para aprovar esta solicitação.' }
  }

  await admin
    .from('event_join_requests')
    .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
    .eq('id', requestId)

  // Create participation (free events get CONFIRMED; paid events wait for payment as PENDING)
  if (!alreadyRegistered) {
    // A linha cancelada é reaproveitada sem cupom; devolve o uso que ela ainda segurar
    if (existing?.coupon_id) {
      await releaseCouponUse(admin, { couponId: existing.coupon_id, userId: req.user_id, eventId: req.event_id })
    }
    const participationStatus = event.price === 0 ? 'CONFIRMED' : 'PENDING'
    const { error: partError } = await admin
      .from('participations')
      .upsert(
        { event_id: req.event_id, user_id: req.user_id, status: participationStatus, discount_cents: 0, coupon_id: null },
        { onConflict: 'event_id,user_id' }
      )

    if (partError) return { error: 'Erro ao criar participação.' }
  }

  await createNotificationAdmin({
    userId: req.user_id,
    type: 'EVENT_JOIN_APPROVED',
    title: 'Solicitação aprovada!',
    body: `Sua solicitação para participar de "${event.title}" foi aprovada.`,
    data: { event_id: req.event_id, event_slug: event.slug },
  })

  revalidatePath(`/eventos/${req.event_id}`)
  revalidatePath(`/eventos/${event.slug ?? req.event_id}`)
  return { success: true }
}

export async function rejectEventJoinRequest(requestId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()
  const { data: req } = await admin
    .from('event_join_requests')
    .select('event_id, user_id')
    .eq('id', requestId)
    .maybeSingle()

  if (!req) return { error: 'Solicitação não encontrada.' }

  const { data: event } = await admin
    .from('events')
    .select('organizer_id, title')
    .eq('id', req.event_id)
    .maybeSingle()

  if (!event || event.organizer_id !== user.id) return { error: 'Sem permissão.' }

  await admin
    .from('event_join_requests')
    .update({ status: 'REJECTED', updated_at: new Date().toISOString() })
    .eq('id', requestId)

  await createNotificationAdmin({
    userId: req.user_id,
    type: 'EVENT_JOIN_REJECTED',
    title: 'Solicitação recusada',
    body: `Sua solicitação para participar de "${event.title}" foi recusada.`,
    data: { event_id: req.event_id },
  })

  revalidatePath(`/eventos/${req.event_id}`)
  return { success: true }
}

export async function updateEventRulesAction(eventId: string, customRules: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: event } = await supabase
    .from('events')
    .select('organizer_id, slug')
    .eq('id', eventId)
    .maybeSingle()

  if (!event || event.organizer_id !== user.id) return { error: 'Sem permissão.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('events')
    .update({ custom_rules: customRules.trim() || null })
    .eq('id', eventId)

  if (error) return { error: 'Erro ao salvar regras.' }

  revalidatePath(`/eventos/${event.slug ?? eventId}`)
  return { success: true }
}

export async function uploadEventCoverAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const eventId = formData.get('eventId') as string
  const file = formData.get('cover') as File | null

  if (!file || file.size === 0) return { error: 'Nenhum arquivo enviado.' }
  if (file.size > 1 * 1024 * 1024) return { error: 'Imagem deve ter no máximo 1 MB.' }

  const { data: event } = await supabase
    .from('events')
    .select('organizer_id, slug')
    .eq('id', eventId)
    .maybeSingle()

  if (!event || event.organizer_id !== user.id) return { error: 'Sem permissão.' }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `event-covers/${eventId}/cover.${ext}`

  const admin = createAdminClient()
  const { error: upError } = await admin.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (upError) return { error: 'Erro ao fazer upload.' }

  const { data: urlData } = admin.storage.from('avatars').getPublicUrl(path)
  const coverUrl = `${urlData.publicUrl}?t=${Date.now()}`

  const { error: dbError } = await admin
    .from('events')
    .update({ cover_url: coverUrl })
    .eq('id', eventId)

  if (dbError) return { error: 'Erro ao salvar URL da capa.' }

  revalidatePath(`/eventos/${event.slug ?? eventId}`)
  return { success: true, coverUrl }
}

// ── Aviso do organizador para os participantes confirmados ──────────────────
export async function sendEventBroadcastAction(eventId: string, message: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const trimmed = message.trim()
  if (!trimmed) return { error: 'Escreva uma mensagem.' }
  if (trimmed.length > 500) return { error: 'Mensagem muito longa (máx. 500 caracteres).' }

  const { data: event } = await supabase
    .from('events')
    .select('id, title, organizer_id')
    .eq('id', eventId)
    .single()

  if (!event || event.organizer_id !== user.id) return { error: 'Sem permissão.' }

  const admin = createAdminClient()
  const { data: participants } = await admin
    .from('participations')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('status', 'CONFIRMED')

  if (!participants || participants.length === 0) {
    return { error: 'Nenhum participante confirmado para notificar.' }
  }

  const { createNotificationAdmin } = await import('@/features/notificacoes/actions')
  const { sendEventBroadcastToParticipant } = await import('@/lib/emails')

  let sent = 0
  await Promise.allSettled(participants.map(async (p) => {
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, notif_email')
      .eq('id', p.user_id)
      .single()

    await createNotificationAdmin({
      userId: p.user_id,
      type: 'EVENT_MESSAGE',
      title: `Aviso: ${event.title}`,
      body: trimmed,
      data: { event_id: eventId },
    })


    if (profile?.notif_email ?? true) {
      const { data: authUser } = await admin.auth.admin.getUserById(p.user_id)
      if (authUser?.user?.email) {
        await sendEventBroadcastToParticipant({
          to: authUser.user.email,
          name: profile?.full_name ?? 'Participante',
          eventTitle: event.title,
          eventId,
          message: trimmed,
        }).catch(() => {})
      }
    }

    sent++
  }))

  return { success: true, sent }
}
