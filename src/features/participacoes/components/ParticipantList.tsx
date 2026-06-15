import { getParticipants } from '../queries'
import { createClient } from '@/lib/supabase/server'
import { UserAvatar } from '@/components/ui/user-avatar'
import { RemoveParticipantButton } from './RemoveParticipantButton'
import { ExportParticipantsButton } from './ExportParticipantsButton'
import { Users } from 'lucide-react'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  CONFIRMED: { label: 'Confirmado', cls: 'text-primary bg-primary/10 border-primary/25' },
  PENDING:   { label: 'Aguardando pagamento', cls: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
}

interface ParticipantListProps {
  eventId: string
  isOrganizer?: boolean
}

function ParticipantRow({ p, eventId, isOrganizer }: { p: any; eventId: string; isOrganizer: boolean }) {
  const profile = p.profiles
  const statusCfg = STATUS_LABEL[p.status] ?? STATUS_LABEL.PENDING

  return (
    <div className="flex items-center gap-3 card-dark rounded-xl p-3">
      <a href={profile?.username ? `/u/${profile.username}` : '#'} className="shrink-0">
        <UserAvatar
          name={profile?.full_name ?? profile?.username ?? '?'}
          avatarUrl={profile?.avatar_url}
          size="sm"
        />
      </a>
      <a href={profile?.username ? `/u/${profile.username}` : '#'} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
        <p className="text-sm font-medium text-white truncate">{profile?.full_name ?? 'Usuário'}</p>
        <p className="text-xs text-white/40">@{profile?.username}</p>
      </a>
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg border ${statusCfg.cls}`}>
        {statusCfg.label}
      </span>
      {isOrganizer && <RemoveParticipantButton participationId={p.id} eventId={eventId} />}
    </div>
  )
}

export async function ParticipantList({ eventId, isOrganizer = false }: ParticipantListProps) {
  const supabase = await createClient()

  const [participants, { data: teamsRaw }] = await Promise.all([
    getParticipants(eventId),
    supabase.from('event_teams').select('id, name, capacity, position').eq('event_id', eventId).order('position'),
  ])

  if (participants.length === 0) {
    return (
      <div className="card-dark rounded-2xl p-8 text-center space-y-2">
        <Users className="size-8 mx-auto text-white/15" />
        <p className="text-sm text-white/35">Nenhum inscrito ainda.</p>
        <p className="text-xs text-white/20">Compartilhe o evento para atrair participantes.</p>
      </div>
    )
  }

  // Se evento tem times, agrupar por time
  if (teamsRaw && teamsRaw.length > 0) {
    const teamMap = new Map(teamsRaw.map((t) => [t.id, t]))
    const byTeam = new Map<string | null, any[]>()
    byTeam.set(null, [])
    for (const t of teamsRaw) byTeam.set(t.id, [])

    for (const p of participants) {
      const tid = (p as any).team_id ?? null
      if (!byTeam.has(tid)) byTeam.set(null, [...(byTeam.get(null) ?? [])])
      byTeam.get(tid)?.push(p)
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/40">{participants.length} inscrito{participants.length !== 1 ? 's' : ''}</p>
          {isOrganizer && <ExportParticipantsButton participants={participants as any[]} />}
        </div>

        {teamsRaw.map((team) => {
          const members = byTeam.get(team.id) ?? []
          const confirmed = members.filter((p) => p.status === 'CONFIRMED').length
          const pct = Math.min(100, (confirmed / team.capacity) * 100)

          return (
            <div key={team.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="size-3.5 text-primary" />
                  <span className="text-sm font-semibold text-white">{team.name}</span>
                </div>
                <span className="text-xs text-white/40">{confirmed}/{team.capacity}</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full ${pct >= 100 ? 'bg-red-400' : pct >= 80 ? 'bg-yellow-400' : 'bg-primary'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {members.length === 0 ? (
                <p className="text-xs text-white/25 pl-1">Nenhum inscrito neste time ainda.</p>
              ) : (
                <div className="space-y-2">
                  {members.map((p: any) => (
                    <ParticipantRow key={p.id} p={p} eventId={eventId} isOrganizer={isOrganizer} />
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Participantes sem time (ex: inscrição antes de times serem ativados) */}
        {(byTeam.get(null) ?? []).length > 0 && (
          <div className="space-y-2">
            <span className="text-xs text-white/30">Sem time</span>
            {(byTeam.get(null) ?? []).map((p: any) => (
              <ParticipantRow key={p.id} p={p} eventId={eventId} isOrganizer={isOrganizer} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Sem times: lista normal
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">{participants.length} inscrito{participants.length !== 1 ? 's' : ''}</p>
        {isOrganizer && <ExportParticipantsButton participants={participants as any[]} />}
      </div>

      <div className="space-y-2">
        {participants.map((p: any) => (
          <ParticipantRow key={p.id} p={p} eventId={eventId} isOrganizer={isOrganizer} />
        ))}
      </div>
    </div>
  )
}
