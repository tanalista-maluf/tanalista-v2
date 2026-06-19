'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'
import type { EventSchema } from './schemas'

// Preço em string "R$ xx,xx" → centavos
function parsePriceToCents(price: string): number {
  return Math.round(parseFloat(price.replace(',', '.')) * 100)
}

// Calcula waitlist_capacity: MAX(1, CEIL(capacity * 0.10))
function calcWaitlistCapacity(capacity: number): number {
  return Math.max(1, Math.ceil(capacity * 0.1))
}

async function generateUniqueEventSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string,
  excludeId?: string
): Promise<string> {
  const base = slugify(title) || 'evento'
  let candidate = base
  let suffix = 2
  while (true) {
    let q = supabase.from('events').select('id').eq('slug', candidate)
    if (excludeId) q = q.neq('id', excludeId)
    const { data } = await q.maybeSingle()
    if (!data) return candidate
    candidate = `${base}${suffix++}`
  }
}

export async function createEventAction(data: EventSchema) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  // Verificar que é membro do grupo
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', data.group_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return { error: 'Você precisa ser membro do grupo para criar eventos.' }

  const starts_at = new Date(data.starts_at)
  const min_check_at = new Date(starts_at.getTime() - 12 * 60 * 60 * 1000)

  const slug = await generateUniqueEventSlug(supabase, data.title)

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      group_id: data.group_id,
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
      status: 'OPEN',
    })
    .select('id, slug')
    .single()

  if (error || !event) return { error: 'Erro ao criar evento.' }

  // Criar times se habilitado
  if (data.use_teams && data.teams && data.teams.length >= 2) {
    const admin = createAdminClient()
    await admin.from('event_teams').insert(
      data.teams.map((t, i) => ({
        event_id: event.id,
        name: t.name,
        capacity: t.capacity,
        position: i,
      }))
    )
  }

  // Generate recurring child events
  if (data.recurrence && data.recurrence !== 'none') {
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
    for (let i = 1; i <= count; i++) {
      const offsetDays = freqDays * i
      const childStart = new Date(startsAt.getTime() + offsetDays * 86400000)
      const childEnd = endsAt ? new Date(childStart.getTime() + durationMs) : null
      const childDeadline = new Date(childStart.getTime() + deadlineOffsetMs)
      const childMinCheck = new Date(childStart.getTime() - 12 * 60 * 60 * 1000)

      children.push({
        group_id: data.group_id,
        organizer_id: user.id,
        title: data.title,
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
        status: 'OPEN' as const,
        parent_event_id: event.id,
        recurrence_rule: rrule,
        recurrence_index: i,
      })
    }

    await admin.from('events').insert(children)

    // Also mark the parent with recurrence_rule
    await admin.from('events').update({ recurrence_rule: rrule }).eq('id', event.id)
  }

  // Notificar membros do grupo sobre o novo evento
  const adminClient = createAdminClient()
  const { data: members } = await adminClient
    .from('group_members')
    .select('user_id')
    .eq('group_id', data.group_id)
    .neq('user_id', user.id)

  if (members && members.length > 0) {
    const { createNotificationAdmin } = await import('@/features/notificacoes/actions')
    await Promise.all(
      members.map((m) =>
        createNotificationAdmin({
          userId: m.user_id,
          type: 'NEW_EVENT',
          title: 'Novo evento no grupo',
          body: data.title,
          data: { event_id: event.id },
        })
      )
    )
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
      .select('title, description, address, slug')
      .eq('id', eventId)
      .single()

    const newSlug = current?.title !== data.title
      ? await generateUniqueEventSlug(supabase, data.title, eventId)
      : (current?.slug ?? await generateUniqueEventSlug(supabase, data.title, eventId))

    const { error } = await supabase
      .from('events')
      .update({ description: data.description || null, address: data.address, visibility: data.visibility ?? 'PUBLIC', slug: newSlug })
      .eq('id', eventId)
    if (error) return { error: 'Erro ao atualizar evento.' }

    // Notifica só se o endereço mudou
    if (current && data.address !== current.address) {
      await notifyParticipants(
        'Endereço do evento alterado',
        `O local de "${current.title}" foi atualizado para: ${data.address}`
      )
    }

    revalidatePath(`/eventos/${newSlug}`)
    redirect(`/eventos/${newSlug}`)
  }

  const starts_at = new Date(data.starts_at)
  const min_check_at = new Date(starts_at.getTime() - 12 * 60 * 60 * 1000)

  // Busca valores anteriores para detectar mudanças relevantes
  const { data: current } = await supabase
    .from('events')
    .select('title, starts_at, address, slug')
    .eq('id', eventId)
    .single()

  const updatedSlug = current?.title !== data.title
    ? await generateUniqueEventSlug(supabase, data.title, eventId)
    : (current?.slug ?? await generateUniqueEventSlug(supabase, data.title, eventId))

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
    })
    .eq('id', eventId)

  if (error) return { error: 'Erro ao atualizar evento.' }

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

export async function publishEventAction(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { error } = await supabase
    .from('events')
    .update({ status: 'OPEN' })
    .eq('id', eventId)
    .eq('organizer_id', user.id)
    .eq('status', 'DRAFT')

  if (error) return { error: 'Erro ao publicar evento.' }

  revalidatePath(`/eventos/${eventId}`)
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
    .select('user_id')
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
    // Reembolso na carteira (só se o evento tinha preço)
    if (event.price > 0) {
      await admin.rpc('wallet_credit', {
        p_user_id: p.user_id,
        p_amount: event.price,
        p_type: 'REFUND',
        p_description: `Reembolso: ${event.title}`,
      })
    }

    // Notificação in-app
    await createNotificationAdmin({
      userId: p.user_id,
      type: 'EVENT_CANCELLED',
      title: 'Evento cancelado',
      body: `"${event.title}" foi cancelado pelo organizador.${event.price > 0 ? ' Seu pagamento foi estornado para a carteira.' : ''}`,
      data: { event_id: eventId },
    })
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

  const admin = createAdminClient()

  // Buscar participação
  const { data: participation } = await admin
    .from('participations')
    .select('id, user_id, event_id, status, team_id, team_changes_used')
    .eq('id', participationId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!participation) return { error: 'Participação não encontrada.' }

  if (participation.status === 'CONFIRMED') {
    if (participation.team_changes_used >= 1) {
      return { error: 'Você já utilizou sua troca de time permitida.' }
    }

    // Verificar se novo time tem vaga
    const { data: team } = await admin
      .from('event_teams')
      .select('capacity')
      .eq('id', newTeamId)
      .single()

    if (!team) return { error: 'Time não encontrado.' }

    const { count } = await admin
      .from('participations')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', newTeamId)
      .eq('status', 'CONFIRMED')

    if ((count ?? 0) >= team.capacity) {
      return { error: 'Este time está lotado. Você pode entrar na fila de espera do time.' }
    }

    await admin
      .from('participations')
      .update({ team_id: newTeamId, team_changes_used: 1 })
      .eq('id', participationId)

    revalidatePath(`/eventos/${participation.event_id}`)
    return { success: true }
  }

  return { error: 'Apenas participantes confirmados podem trocar de time aqui.' }
}

// ── Troca de fila de espera entre times (ilimitado) ───────────────────────────
export async function changeWaitlistTeamAction(waitlistId: string, newTeamId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()

  const { data: entry } = await admin
    .from('waitlist_entries')
    .select('id, user_id, event_id, status')
    .eq('id', waitlistId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!entry) return { error: 'Entrada na fila não encontrada.' }
  if (entry.status !== 'WAITING') return { error: 'Só é possível trocar de fila enquanto aguarda.' }

  await admin
    .from('waitlist_entries')
    .update({ team_id: newTeamId })
    .eq('id', waitlistId)

  revalidatePath(`/eventos/${entry.event_id}`)
  return { success: true }
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

  const admin = createAdminClient()
  const { error } = await admin
    .from('event_join_requests')
    .upsert({ event_id: eventId, user_id: user.id, status: 'PENDING', updated_at: new Date().toISOString() }, { onConflict: 'event_id,user_id' })

  if (error) return { error: 'Erro ao enviar solicitação.' }

  // Notify organizer
  const { data: event } = await admin
    .from('events')
    .select('organizer_id, title, slug')
    .eq('id', eventId)
    .maybeSingle()

  const { data: requester } = await admin
    .from('profiles')
    .select('full_name, username')
    .eq('id', user.id)
    .maybeSingle()

  if (event?.organizer_id) {
    const requesterName = requester?.full_name ?? requester?.username ?? 'Alguém'
    await admin.from('notifications').insert({
      user_id: event.organizer_id,
      type: 'EVENT_JOIN_REQUEST',
      title: 'Solicitação de participação',
      body: `${requesterName} quer participar de "${event.title}".`,
      data: { event_id: eventId, event_slug: event.slug, requester_id: user.id },
      read: false,
    })
  }

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
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
    .select('organizer_id, title, slug, price')
    .eq('id', req.event_id)
    .maybeSingle()

  if (!event || event.organizer_id !== user.id) return { error: 'Sem permissão.' }

  await admin
    .from('event_join_requests')
    .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
    .eq('id', requestId)

  // Create participation (free events get CONFIRMED; paid events get PENDING_PAYMENT)
  const participationStatus = event.price === 0 ? 'CONFIRMED' : 'PENDING_PAYMENT'
  const { error: partError } = await admin
    .from('participations')
    .upsert({ event_id: req.event_id, user_id: req.user_id, status: participationStatus }, { onConflict: 'event_id,user_id' })

  if (partError) return { error: 'Erro ao criar participação.' }

  await admin.from('notifications').insert({
    user_id: req.user_id,
    type: 'EVENT_JOIN_APPROVED',
    title: 'Solicitação aprovada!',
    body: `Sua solicitação para participar de "${event.title}" foi aprovada.`,
    data: { event_id: req.event_id, event_slug: event.slug },
    read: false,
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

  await admin.from('notifications').insert({
    user_id: req.user_id,
    type: 'EVENT_JOIN_REJECTED',
    title: 'Solicitação recusada',
    body: `Sua solicitação para participar de "${event.title}" foi recusada.`,
    data: { event_id: req.event_id },
    read: false,
  })

  revalidatePath(`/eventos/${req.event_id}`)
  return { success: true }
}
