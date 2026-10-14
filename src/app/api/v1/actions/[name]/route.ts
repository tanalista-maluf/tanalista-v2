import { NextResponse } from 'next/server'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { getURLFromRedirectError } from 'next/dist/client/components/redirect'
import type { User } from '@supabase/supabase-js'
import { getBearerSession } from '@/lib/supabase/bearer'
import { runWithSupabaseClient } from '@/lib/supabase/request-context'
import {
  approveEventJoinRequest,
  cancelEventAction,
  createEventAction,
  publishEventAction,
  regenerateEventInviteAction,
  rejectEventJoinRequest,
  sendEventBroadcastAction,
  updateEventAction,
  updateEventRulesAction,
  uploadEventCoverAction,
} from '@/features/eventos/actions'
import { checkInAction } from '@/features/eventos/actions-checkin'
import { getOrganizerEventData } from '@/features/eventos/organizer'
import { removeParticipantAction } from '@/features/participacoes/actions'
import {
  createCouponAction,
  createEventCouponAction,
  listEventCouponsAction,
  toggleCouponAction,
  toggleEventCouponAction,
} from '@/features/cupons/actions'
import {
  joinGroupByInviteAction,
  regenerateInviteTokenAction,
  removeMemberAction,
  requestGroupJoinAction,
  sendGroupBroadcastAction,
  transferGroupOwnershipAction,
  updateGroupAction,
  deleteGroupAction,
  uploadGroupAvatarAction,
} from '@/features/grupos/actions'
import { createListingAction, deleteListingAction, publishDraftListingAction } from '@/features/marketplace/actions'
import { getGroupListings } from '@/features/marketplace/queries'
import { claimEventPayoutAction } from '@/features/financeiro/actions'
import { getEventFinancialDetail, getOrganizerFinancials, getOrganizerSummary } from '@/features/financeiro/queries'
import { cancelWithdrawalAction, confirmWithdrawalAction } from '@/features/saques/actions'
import {
  getAdminDashboard,
  isAdminEmail,
  listAdminCoupons,
  listAdminEvents,
  listAdminGroups,
  listAdminUsers,
  listAdminWithdrawals,
} from '@/features/admin/queries'

// Ponte do app mobile para as server actions e consultas do site. Em vez de
// reescrever cada regra numa rota própria, a rota roda a mesma função que o
// site usa, com o usuário do token Bearer no lugar da sessão em cookie (ver
// lib/supabase/request-context.ts). Só os nomes desta lista são aceitos; os
// argumentos chegam como vieram e cada ação já valida os seus, como faz quando
// o navegador a chama.

type Handler = (args: unknown[], user: User) => Promise<unknown>

const text = (value: unknown) => (typeof value === 'string' ? value : '')
const optionalText = (value: unknown) => (typeof value === 'string' ? value : undefined)

// Arquivo enviado pelo app em base64, como as ações de upload do site esperam (FormData)
function formWithFile(fields: Record<string, string>, fileField: string, file: unknown) {
  const { base64, mimeType } = (file ?? {}) as { base64?: unknown; mimeType?: unknown }
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) form.append(key, value)
  if (typeof base64 === 'string' && typeof mimeType === 'string' && base64.length < 8_000_000) {
    form.append(fileField, new File([Buffer.from(base64, 'base64')], fileField, { type: mimeType }))
  }
  return form
}

function adminOnly(handler: Handler): Handler {
  return async (args, user) => (isAdminEmail(user.email) ? handler(args, user) : { error: 'Acesso negado.' })
}

const HANDLERS: Record<string, Handler> = {
  // ── Organizador: evento ────────────────────────────────────────────────────
  createEvent: ([data]) => createEventAction(data as never),
  updateEvent: ([eventId, data]) => updateEventAction(text(eventId), data as never),
  publishEvent: ([eventId]) => publishEventAction(text(eventId)),
  cancelEvent: ([eventId, reason]) => cancelEventAction(text(eventId), optionalText(reason)),
  updateEventRules: ([eventId, rules]) => updateEventRulesAction(text(eventId), text(rules)),
  uploadEventCover: ([eventId, file]) => uploadEventCoverAction(formWithFile({ eventId: text(eventId) }, 'cover', file)),
  regenerateEventInvite: ([eventId]) => regenerateEventInviteAction(text(eventId)),
  approveEventJoinRequest: ([requestId]) => approveEventJoinRequest(text(requestId)),
  rejectEventJoinRequest: ([requestId]) => rejectEventJoinRequest(text(requestId)),
  sendEventBroadcast: ([eventId, message]) => sendEventBroadcastAction(text(eventId), text(message)),
  checkIn: ([eventId, participationId]) => checkInAction(text(eventId), text(participationId)),
  removeParticipant: ([participationId, eventId]) => removeParticipantAction(text(participationId), text(eventId)),
  listEventCoupons: ([eventId]) => listEventCouponsAction(text(eventId)),
  createEventCoupon: ([eventId, input]) => createEventCouponAction(text(eventId), input),
  toggleEventCoupon: ([eventId, couponId, active]) =>
    toggleEventCouponAction(text(eventId), text(couponId), active === true),
  organizerEvent: async ([eventId], user) =>
    (await getOrganizerEventData(user.id, text(eventId))) ?? { error: 'Apenas o organizador vê estes dados.' },

  // ── Financeiro do organizador ──────────────────────────────────────────────
  organizerSummary: ([range]) => getOrganizerSummary((range ?? undefined) as { from?: string; to?: string }),
  organizerFinancials: ([range]) => getOrganizerFinancials((range ?? undefined) as { from?: string; to?: string }),
  eventFinancial: ([eventId]) => getEventFinancialDetail(text(eventId)),
  claimEventPayout: ([eventId]) => claimEventPayoutAction(text(eventId)),

  // ── Grupos ─────────────────────────────────────────────────────────────────
  updateGroup: ([groupId, data]) => updateGroupAction(text(groupId), data as never),
  uploadGroupAvatar: ([groupId, file]) => uploadGroupAvatarAction(formWithFile({ groupId: text(groupId) }, 'avatar', file)),
  joinGroupByInvite: ([token]) => joinGroupByInviteAction(text(token)),
  regenerateGroupInvite: ([groupId]) => regenerateInviteTokenAction(text(groupId)),
  removeGroupMember: ([groupId, memberId]) => removeMemberAction(text(groupId), text(memberId)),
  requestGroupJoin: ([groupId]) => requestGroupJoinAction(text(groupId)),
  transferGroupOwnership: ([groupId, userId]) => transferGroupOwnershipAction(text(groupId), text(userId)),
  deleteGroup: ([groupId]) => deleteGroupAction(text(groupId)),
  sendGroupBroadcast: ([groupId, message]) => sendGroupBroadcastAction(text(groupId), text(message)),

  // ── Marketplace do grupo ───────────────────────────────────────────────────
  groupListings: ([groupId], user) => getGroupListings(text(groupId), user.id),
  createListing: ([groupId, data]) => createListingAction(text(groupId), data as never),
  publishDraftListing: ([listingId]) => publishDraftListingAction(text(listingId)),
  deleteListing: ([listingId]) => deleteListingAction(text(listingId)),

  // ── Admin ──────────────────────────────────────────────────────────────────
  // Se a pessoa vê o painel de admin no app (mesma lista ADMIN_EMAILS do site)
  amIAdmin: async (_, user) => ({ admin: isAdminEmail(user.email) }),
  adminDashboard: adminOnly(() => getAdminDashboard()),
  adminWithdrawals: adminOnly(() => listAdminWithdrawals()),
  adminUsers: adminOnly(([q]) => listAdminUsers(optionalText(q))),
  adminEvents: adminOnly(([q, status]) => listAdminEvents(optionalText(q), optionalText(status))),
  adminGroups: adminOnly(() => listAdminGroups()),
  adminCoupons: adminOnly(() => listAdminCoupons()),
  adminCreateCoupon: adminOnly(([input]) => createCouponAction(input)),
  adminToggleCoupon: adminOnly(([id, active]) => toggleCouponAction(text(id), active === true)),
  adminConfirmWithdrawal: adminOnly(([id, note]) => confirmWithdrawalAction(text(id), optionalText(note))),
  adminCancelWithdrawal: adminOnly(([id, note]) => cancelWithdrawalAction(text(id), optionalText(note))),
}

export async function POST(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { name } = await params
  const handler = Object.hasOwn(HANDLERS, name) ? HANDLERS[name] : null
  if (!handler) return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const args = Array.isArray(body?.args) ? body.args : []

  try {
    const result = await runWithSupabaseClient(session.supabase, () => handler(args, session.user))
    return NextResponse.json({ result: result ?? null })
  } catch (error) {
    // Ações do site terminam com redirect() quando dá certo: o app recebe o destino
    if (isRedirectError(error)) return NextResponse.json({ redirect: getURLFromRedirectError(error) })
    console.error(`[API ACTIONS] ${name}`, error)
    const message = error instanceof Error && error.message === 'Acesso negado.' ? error.message : 'Erro ao processar.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
