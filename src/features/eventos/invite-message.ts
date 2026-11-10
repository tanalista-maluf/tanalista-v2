import { format as dateFnsFormat } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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

  const numbered = (names: string[]) => names.map((n, i) => `${i + 1}- ${n}`).join('\n')

  if (event.teams.length > 0) {
    const blocks = event.teams
      .map(t => ({ name: t.name, names: byTeam.get(t.id) ?? [] }))
      .filter(t => t.names.length > 0)
      .map(t => `${t.name}:\n${numbered(t.names)}`)
    if (noTeam.length > 0) blocks.push(`Sem time:\n${numbered(noTeam)}`)
    return blocks.join('\n\n')
  }

  return numbered(noTeam)
}

export function buildInviteMessage(event: InviteEvent, shareUrl: string) {
  const participantsListText = buildParticipantsListText(event)
  const startsAt = new Date(event.starts_at)
  const dayLabel = dateFnsFormat(startsAt, "EEE, dd 'de' MMMM", { locale: ptBR })
  const timeLabel = dateFnsFormat(startsAt, 'HH:mm', { locale: ptBR })
  return [
    `Quem já confirmou no "${event.title}":`,
    '',
    participantsListText || 'Ainda ninguém confirmado — seja o primeiro!',
    '',
    `📅 ${dayLabel}`,
    `🕒 ${timeLabel}`,
    `📍 ${event.city}`,
    `👉 Inscreva-se: ${shareUrl}`,
  ].join('\n')
}
