import { Resend } from 'resend'
import { formatPrice, formatDateTime } from '@/utils/format'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? 'disabled')
}
const FROM = process.env.RESEND_FROM_EMAIL
  ? `TáNaLista <${process.env.RESEND_FROM_EMAIL}>`
  : 'TáNaLista <noreply@tanalista.app>'

function base(title: string, body: string) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
        <tr><td style="background:#2E8B57;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">TáNaLista</h1>
        </td></tr>
        <tr><td style="padding:32px;">${body}</td></tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #f4f4f5;text-align:center;">
          <p style="margin:0;font-size:11px;color:#a1a1aa;">
            Você recebeu este e-mail porque tem uma conta no TáNaLista.<br>
            <a href="{{unsubscribe}}" style="color:#2E8B57;">Cancelar notificações</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function h2(text: string) {
  return `<h2 style="margin:0 0 16px;font-size:18px;color:#2B2D31;">${text}</h2>`
}

function p(text: string) {
  return `<p style="margin:0 0 12px;font-size:14px;color:#52525b;line-height:1.6;">${text}</p>`
}

function btn(text: string, url: string) {
  return `<div style="margin:24px 0 0;text-align:center;">
    <a href="${url}" style="display:inline-block;background:#2E8B57;color:#ffffff;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;">${text}</a>
  </div>`
}

function infoBox(lines: string[]) {
  const rows = lines.map((l) => `<li style="margin-bottom:6px;font-size:14px;color:#52525b;">${l}</li>`).join('')
  return `<ul style="background:#f4f4f5;border-radius:8px;padding:16px 16px 16px 28px;margin:16px 0;">${rows}</ul>`
}

// ── Email: solicitação de saque (para o admin processar manualmente) ─────────
export async function sendWithdrawalRequestAdmin(params: {
  userName: string
  userEmail: string
  amountCents: number
  feeCents: number
  netCents: number
  pixKey: string
  pixKeyType: string
}) {
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!adminEmails.length) return

  const body = base(
    'Nova solicitação de saque',
    h2('Nova solicitação de saque') +
    p(`<strong>${params.userName}</strong> (${params.userEmail}) solicitou um saque.`) +
    infoBox([
      `Valor solicitado: <strong>${formatPrice(params.amountCents)}</strong>`,
      `Taxa (${((params.feeCents / params.amountCents) * 100).toFixed(0)}%): <strong>− ${formatPrice(params.feeCents)}</strong>`,
      `Valor a transferir: <strong>${formatPrice(params.netCents)}</strong>`,
      `Chave PIX (${params.pixKeyType.toUpperCase()}): <strong>${params.pixKey}</strong>`,
    ]) +
    p('Por favor, realize a transferência PIX manualmente e confirme o pagamento.')
  )

  await getResend().emails.send({
    from: FROM,
    to: adminEmails,
    subject: `Saque solicitado: ${formatPrice(params.netCents)} → ${params.pixKey}`,
    html: body,
  })
}

// ── Email: lembrete do evento ─────────────────────────────────────────────────
export async function sendEventReminder(params: {
  to: string
  name: string
  eventTitle: string
  eventDate: string
  eventAddress: string
  eventCity: string
  eventId: string
  hoursUntil: number
}) {
  const label = params.hoursUntil <= 2 ? `em ${params.hoursUntil}h` : 'amanhã'
  const body = base(
    `Lembrete: ${params.eventTitle}`,
    h2(`Seu evento é ${label}! 📅`) +
    p(`Olá, <strong>${params.name}</strong>! Lembre-se que você está confirmado no evento:`) +
    infoBox([
      `Evento: <strong>${params.eventTitle}</strong>`,
      `Data: <strong>${formatDateTime(params.eventDate)}</strong>`,
      `Local: <strong>${params.eventAddress} — ${params.eventCity}</strong>`,
    ]) +
    p('Não se esqueça de trazer seu ingresso (QR Code disponível na aba Ingresso).') +
    btn('Ver ingresso', `${process.env.NEXT_PUBLIC_APP_URL}/eventos/${params.eventId}`)
  )

  await getResend().emails.send({
    from: FROM,
    to: params.to,
    subject: `Lembrete: ${params.eventTitle} é ${label}`,
    html: body,
  })
}

// ── Email: inscrição confirmada ───────────────────────────────────────────────
export async function sendParticipationConfirmed(params: {
  to: string
  name: string
  eventTitle: string
  eventDate: string
  eventCity: string
  eventId: string
  price: number
}) {
  const body = base(
    'Inscrição confirmada!',
    h2('Inscrição confirmada! 🎉') +
    p(`Olá, <strong>${params.name}</strong>! Sua inscrição foi confirmada.`) +
    infoBox([
      `Evento: <strong>${params.eventTitle}</strong>`,
      `Data: <strong>${formatDateTime(params.eventDate)}</strong>`,
      `Local: <strong>${params.eventCity}</strong>`,
      params.price > 0 ? `Valor pago: <strong>${formatPrice(params.price)}</strong>` : 'Inscrição gratuita',
    ]) +
    p('Fique de olho nas notificações caso haja atualizações.') +
    btn('Ver evento', `${process.env.NEXT_PUBLIC_APP_URL}/eventos/${params.eventId}`)
  )

  await getResend().emails.send({ from: FROM, to: params.to, subject: `Inscrição confirmada: ${params.eventTitle}`, html: body })
}

// ── Email: vaga na fila de espera disponível ──────────────────────────────────
export async function sendWaitlistNotified(params: {
  to: string
  name: string
  eventTitle: string
  eventId: string
  expiresAt: string
}) {
  const body = base(
    'Vaga disponível!',
    h2('Uma vaga abriu para você! ⏰') +
    p(`Olá, <strong>${params.name}</strong>! Uma vaga no evento <strong>${params.eventTitle}</strong> está reservada para você.`) +
    p(`Você tem até <strong>${formatDateTime(params.expiresAt)}</strong> para confirmar sua inscrição. Após esse prazo, a vaga passará para o próximo da lista.`) +
    btn('Confirmar inscrição', `${process.env.NEXT_PUBLIC_APP_URL}/eventos/${params.eventId}`)
  )

  await getResend().emails.send({ from: FROM, to: params.to, subject: `Vaga disponível: ${params.eventTitle}`, html: body })
}

// ── Email: evento cancelado (para participantes) ──────────────────────────────
export async function sendEventCancelledToParticipant(params: {
  to: string
  name: string
  eventTitle: string
  refundAmount: number
}) {
  const body = base(
    'Evento cancelado',
    h2('O evento foi cancelado') +
    p(`Olá, <strong>${params.name}</strong>. Infelizmente o evento <strong>${params.eventTitle}</strong> foi cancelado.`) +
    (params.refundAmount > 0
      ? p(`O valor de <strong>${formatPrice(params.refundAmount)}</strong> foi creditado na sua carteira TáNaLista.`)
      : p('Sua inscrição era gratuita, não há valores a reembolsar.')) +
    btn('Explorar outros eventos', `${process.env.NEXT_PUBLIC_APP_URL}/eventos`)
  )

  await getResend().emails.send({ from: FROM, to: params.to, subject: `Evento cancelado: ${params.eventTitle}`, html: body })
}

// ── Email: mínimo não atingido (para o organizador) ──────────────────────────
export async function sendOrganizerMinNotMet(params: {
  to: string
  name: string
  eventTitle: string
  eventId: string
  confirmedCount: number
  minParticipants: number
}) {
  const body = base(
    'Mínimo de participantes não atingido',
    h2('Atenção: mínimo não atingido') +
    p(`Olá, <strong>${params.name}</strong>. O evento <strong>${params.eventTitle}</strong> atingiu o ponto de verificação de mínimo de participantes.`) +
    infoBox([
      `Confirmados: <strong>${params.confirmedCount}</strong>`,
      `Mínimo exigido: <strong>${params.minParticipants}</strong>`,
    ]) +
    p('Você pode cancelar o evento antes que ele comece, e todos os participantes serão reembolsados automaticamente. Ou aguarde — mais pessoas podem se inscrever até o prazo.') +
    btn('Gerenciar evento', `${process.env.NEXT_PUBLIC_APP_URL}/eventos/${params.eventId}`)
  )

  await getResend().emails.send({ from: FROM, to: params.to, subject: `Mínimo não atingido: ${params.eventTitle}`, html: body })
}

// ── Email: evento concluído + repasse (para o organizador) ───────────────────
export async function sendOrganizerEventCompleted(params: {
  to: string
  name: string
  eventTitle: string
  eventId: string
  participantCount: number
  netRevenue: number
}) {
  const body = base(
    'Evento concluído!',
    h2('Evento concluído com sucesso! 🏁') +
    p(`Olá, <strong>${params.name}</strong>. Seu evento <strong>${params.eventTitle}</strong> foi concluído.`) +
    infoBox([
      `Participantes: <strong>${params.participantCount}</strong>`,
      `Receita líquida: <strong>${formatPrice(params.netRevenue)}</strong>`,
    ]) +
    p('O repasse será processado em até 2 dias úteis na sua conta Mercado Pago.') +
    btn('Ver financeiro', `${process.env.NEXT_PUBLIC_APP_URL}/financeiro`)
  )

  await getResend().emails.send({ from: FROM, to: params.to, subject: `Evento concluído: ${params.eventTitle}`, html: body })
}

