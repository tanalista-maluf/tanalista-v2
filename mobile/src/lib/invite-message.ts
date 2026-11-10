type Participant = { status: string; team_id: string | null; profile: { full_name: string | null } | null }
type Team = { id: string; name: string }

function buildParticipantsListText(participants: Participant[], teams: Team[]) {
  const firstName = (full: string) => full.split(' ')[0]
  const byTeam = new Map<string, string[]>()
  const noTeam: string[] = []

  for (const p of participants) {
    if (p.status !== 'CONFIRMED') continue
    const n = firstName(p.profile?.full_name ?? '?')
    if (p.team_id) {
      if (!byTeam.has(p.team_id)) byTeam.set(p.team_id, [])
      byTeam.get(p.team_id)!.push(n)
    } else {
      noTeam.push(n)
    }
  }

  const numbered = (names: string[]) => names.map((n, i) => `${i + 1}- ${n}`).join('\n')

  if (teams.length > 0) {
    const blocks = teams
      .map((t) => ({ name: t.name, names: byTeam.get(t.id) ?? [] }))
      .filter((t) => t.names.length > 0)
      .map((t) => `${t.name}:\n${numbered(t.names)}`)
    if (noTeam.length > 0) blocks.push(`Sem time:\n${numbered(noTeam)}`)
    return blocks.join('\n\n')
  }

  return numbered(noTeam)
}

// Mesmo formato de mensagem de convite usado na página pública do evento no
// site (src/features/eventos/invite-message.ts): mantenha as duas em sincronia.
export function buildInviteMessage(
  event: { title: string; city: string; starts_at: string },
  participants: Participant[],
  teams: Team[],
  shareUrl: string,
) {
  const participantsListText = buildParticipantsListText(participants, teams)
  const startsAt = new Date(event.starts_at)
  const dayLabel = startsAt
    .toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long' })
    .replace('.', '')
  const timeLabel = startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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
