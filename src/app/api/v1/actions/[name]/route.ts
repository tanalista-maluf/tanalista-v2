import { NextResponse } from 'next/server'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { getURLFromRedirectError } from 'next/dist/client/components/redirect'
import type { User } from '@supabase/supabase-js'
import { getBearerSession } from '@/lib/supabase/bearer'
import { runWithSupabaseClient } from '@/lib/supabase/request-context'
import { signReportToken } from '@/lib/report-token'
import {
  approveEventJoinRequest,
  cancelEventAction,
  createEventAction,
  publishEventAction,
  deleteDraftEventAction,
  regenerateEventInviteAction,
  rejectEventJoinRequest,
  sendEventBroadcastAction,
  updateEventAction,
  updateEventRulesAction,
  uploadEventCoverAction,
} from '@/features/eventos/actions'
import { checkInAction } from '@/features/eventos/actions-checkin'
import { purgeCancelledEvents } from '@/features/admin/cleanup'
import { getGroupPreview } from '@/features/grupos/queries-public'
import { deleteEventPhotoAction } from '@/features/galeria/actions'
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
  setGroupMemberRoleAction,
  requestGroupJoinAction,
  sendGroupBroadcastAction,
  transferGroupOwnershipAction,
  updateGroupAction,
  deleteGroupAction,
  uploadGroupAvatarAction,
} from '@/features/grupos/actions'
import {
  archiveTaskAction,
  completeTaskAction,
  createCriterionAction,
  createMemberFieldAction,
  createTaskAction,
  rateMemberAction,
  toggleCriterionAction,
  toggleMemberFieldAction,
  toggleTaskAction,
  undoTaskCompletionAction,
  updateCriterionAction,
  updateTaskAction,
  addMemberFieldEntryAction,
  deleteMemberFieldEntryAction,
} from '@/features/reputacao/actions'
import { getGroupReputationConfig, getGroupReputationOverview, getMemberReputationDetail } from '@/features/reputacao/queries'
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
const num = (value: unknown) => (typeof value === 'number' ? value : Number(value))

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
  deleteDraftEvent: ([eventId]) => deleteDraftEventAction(text(eventId)),
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
  // Link de relatório em PDF pra abrir no navegador do sistema (ver
  // api/v1/events/[id]/relatorio): token próprio porque essa rota não recebe
  // o Bearer normal (é navegação, não fetch do app).
  eventReportToken: async ([eventId], user) => {
    const { event } = await getEventFinancialDetail(text(eventId))
    if (!event) return { error: 'Evento não encontrado.' }
    const token = signReportToken(text(eventId), user.id)
    return { url: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/events/${text(eventId)}/relatorio?token=${token}` }
  },

  // ── Grupos ─────────────────────────────────────────────────────────────────
  updateGroup: ([groupId, data]) => updateGroupAction(text(groupId), data as never),
  uploadGroupAvatar: ([groupId, file]) => uploadGroupAvatarAction(formWithFile({ groupId: text(groupId) }, 'avatar', file)),
  joinGroupByInvite: ([token]) => joinGroupByInviteAction(text(token)),
  regenerateGroupInvite: ([groupId]) => regenerateInviteTokenAction(text(groupId)),
  removeGroupMember: ([groupId, memberId]) => removeMemberAction(text(groupId), text(memberId)),
  setGroupMemberRole: ([groupId, memberId, role]) =>
    setGroupMemberRoleAction(text(groupId), text(memberId), text(role) === 'MANAGER' ? 'MANAGER' : 'MEMBER'),
  requestGroupJoin: ([groupId]) => requestGroupJoinAction(text(groupId)),
  deleteEventPhoto: ([photoId, eventId]) => deleteEventPhotoAction(text(photoId), text(eventId)),
  groupPreview: async ([slug], user) => (await getGroupPreview(text(slug), user.id)) ?? { error: 'Grupo não encontrado.' },
  transferGroupOwnership: ([groupId, userId]) => transferGroupOwnershipAction(text(groupId), text(userId)),
  deleteGroup: ([groupId]) => deleteGroupAction(text(groupId)),
  sendGroupBroadcast: ([groupId, message]) => sendGroupBroadcastAction(text(groupId), text(message)),

  // ── Avaliação de membros do grupo ───────────────────────────────────────────
  groupReputationOverview: ([groupId]) =>
    getGroupReputationOverview(text(groupId)).then((r) => r ?? { error: 'Apenas dono ou gestores do grupo.' }),
  groupReputationConfig: ([groupId]) =>
    getGroupReputationConfig(text(groupId)).then((r) => r ?? { error: 'Apenas dono ou gestores do grupo.' }),
  memberReputationDetail: ([groupId, memberId]) =>
    getMemberReputationDetail(text(groupId), text(memberId)).then((r) => r ?? { error: 'Apenas dono ou gestores do grupo.' }),
  createCriterion: ([groupId, name]) => createCriterionAction(text(groupId), text(name)),
  updateCriterion: ([groupId, criterionId, name]) => updateCriterionAction(text(groupId), text(criterionId), text(name)),
  toggleCriterion: ([groupId, criterionId, active]) => toggleCriterionAction(text(groupId), text(criterionId), active === true),
  rateMember: ([groupId, criterionId, memberId, score]) =>
    rateMemberAction(text(groupId), text(criterionId), text(memberId), num(score)),
  createTask: ([groupId, title, description]) => createTaskAction(text(groupId), text(title), text(description)),
  updateTask: ([groupId, taskId, title, description]) =>
    updateTaskAction(text(groupId), text(taskId), text(title), text(description)),
  toggleTask: ([groupId, taskId, active]) => toggleTaskAction(text(groupId), text(taskId), active === true),
  archiveTask: ([groupId, taskId, archived]) => archiveTaskAction(text(groupId), text(taskId), archived === true),
  completeTask: ([groupId, taskId, memberId]) => completeTaskAction(text(groupId), text(taskId), text(memberId)),
  undoTaskCompletion: ([groupId, completionId]) => undoTaskCompletionAction(text(groupId), text(completionId)),
  createMemberField: ([groupId, label, unit]) => createMemberFieldAction(text(groupId), text(label), text(unit)),
  toggleMemberField: ([groupId, fieldId, active]) => toggleMemberFieldAction(text(groupId), text(fieldId), active === true),
  addMemberFieldEntry: ([groupId, fieldId, memberId, value, recordedAt]) =>
    addMemberFieldEntryAction(text(groupId), text(fieldId), text(memberId), text(value), text(recordedAt)),
  deleteMemberFieldEntry: ([groupId, entryId]) => deleteMemberFieldEntryAction(text(groupId), text(entryId)),

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
  adminPurgeCancelledEvents: adminOnly(() => purgeCancelledEvents()),
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
