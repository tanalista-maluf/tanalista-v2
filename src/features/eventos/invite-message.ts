import { formatDateTime } from '@/utils/format'

type InviteEvent = {
  title: string
  city: string
  starts_at: string
  confirmed_all: Array<{ name: string; teamId: string | null }>
  teams: Array<{ id: string; name: string }>
}

export function buildParticipantsListText(event: Pick<InviteEvent, 'confirmed_all' | 'teams'>) {
  const firstName = (full: string) => full.split(' ')[0]
  const byTeam = new Map<string, string[]>()
  const noTeam: string[] = []

  for (const p of event.confirmed_all) {
    const n = firstName(p.name)
    if (p.teamId) {
      if (!byTeam.has(p.teamId)) byTeam.set(p.teamId, [])
      byTeam.get(p.teamId)!.push(n)
    } else {
      noTeam.push(n)
    }
  }

  if (event.teams.length > 0) {
    const lines = event.teams
      .map(t => ({ name: t.name, names: byTeam.get(t.id) ?? [] }))
      .filter(t => t.names.length > 0)
      .map(t => `${t.name}: ${t.names.join(', ')}`)
    if (noTeam.length > 0) lines.push(`Sem time: ${noTeam.join(', ')}`)
    return lines.join('\n')
  }

  return noTeam.join(', ')
}

export function buildInviteMessage(event: InviteEvent, shareUrl: string) {
  const participantsListText = buildParticipantsListText(event)
  return [
    `Quem já confirmou no "${event.title}":`,
    '',
    participantsListText || 'Ainda ninguém confirmado — seja o primeiro!',
    '',
    `📅 ${formatDateTime(event.starts_at)} · 📍 ${event.city}`,
    `👉 Inscreva-se: ${shareUrl}`,
  ].join('\n')
}
