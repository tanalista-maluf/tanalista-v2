import { getParticipants, getWaitlist } from '../queries'
import { createClient } from '@/lib/supabase/server'
import { UserAvatar } from '@/components/ui/user-avatar'
import { RemoveParticipantButton } from './RemoveParticipantButton'
import { ExportParticipantsButton } from './ExportParticipantsButton'
import { Users, Clock } from 'lucide-react'

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

function WaitlistRow({ entry }: { entry: any }) {
  const profile = entry.profiles
  const isNotified = entry.status === 'NOTIFIED'

  return (
    <div className="flex items-center gap-3 rounded-xl p-3 bg-white/[0.03] border border-white/[0.06]">
      <div className="shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
        <span className="text-[11px] font-bold text-white/50">{entry.position}</span>
      </div>
      <a href={profile?.username ? `/u/${profile.username}` : '#'} className="shrink-0">
        <UserAvatar
          name={profile?.full_name ?? profile?.username ?? '?'}
          avatarUrl={profile?.avatar_url}
          size="sm"
        />
      </a>
      <a href={profile?.username ? `/u/${profile.username}` : '#'} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
        <p className="text-sm font-medium text-white/70 truncate">{profile?.full_name ?? 'Usuário'}</p>
        <p className="text-xs text-white/30">@{profile?.username}</p>
      </a>
      {isNotified && (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg border text-yellow-400 bg-yellow-400/10 border-yellow-400/20">
          Notificado
        </span>
      )}
    </div>
  )
}

function WaitlistSection({ waitlist, teams }: { waitlist: any[]; teams: any[] }) {
  if (waitlist.length === 0) return null

  const hasTeams = teams.length > 0

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 pt-1">
        <div className="h-px flex-1 bg-white/[0.06]" />
        <div className="flex items-center gap-1.5 text-xs text-white/40 font-medium">
          <Clock className="size-3" />
          Fila de espera · {waitlist.length} pessoa{waitlist.length !== 1 ? 's' : ''}
        </div>
        <div className="h-px flex-1 bg-white/[0.06]" />
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
        {!hasTeams && (
          <div className="space-y-2">
            {waitlist.map((entry) => (
              <WaitlistRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}

        {hasTeams && (() => {
          const byTeam = new Map<string | null, any[]>()
          byTeam.set(null, [])
          for (const t of teams) byTeam.set(t.id, [])
          for (const entry of waitlist) {
            const tid = entry.team_id ?? null
            if (!byTeam.has(tid)) byTeam.set(null, [...(byTeam.get(null) ?? [])])
            byTeam.get(tid)?.push(entry)
          }

          return (
            <div className="space-y-4">
              {teams.map((team) => {
                const entries = byTeam.get(team.id) ?? []
                if (entries.length === 0) return null
                return (
                  <div key={team.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="size-3 text-primary/60" />
                      <span className="text-xs font-semibold text-white/50">{team.name}</span>
                      <span className="text-[10px] text-white/25">{entries.length} na fila</span>
                    </div>
                    {entries.map((entry: any) => (
                      <WaitlistRow key={entry.id} entry={entry} />
                    ))}
                  </div>
                )
              })}
              {(byTeam.get(null) ?? []).length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs text-white/30">Sem time</span>
                  {(byTeam.get(null) ?? []).map((entry: any) => (
                    <WaitlistRow key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

export async function ParticipantList({ eventId, isOrganizer = false }: ParticipantListProps) {
  const supabase = await createClient()

  const [participants, waitlist, { data: teamsRaw }] = await Promise.all([
    getParticipants(eventId),
    getWaitlist(eventId),
    supabase.from('event_teams').select('id, name, capacity, position').eq('event_id', eventId).order('position'),
  ])

  const teams = teamsRaw ?? []

  if (participants.length === 0 && waitlist.length === 0) {
    return (
      <div className="card-dark rounded-2xl p-8 text-center space-y-2">
        <Users className="size-8 mx-auto text-white/15" />
        <p className="text-sm text-white/35">Nenhum inscrito ainda.</p>
        <p className="text-xs text-white/20">Compartilhe o evento para atrair participantes.</p>
      </div>
    )
  }

  // Com times: agrupar confirmados por time, depois mostrar fila
  if (teams.length > 0) {
    const teamMap = new Map(teams.map((t) => [t.id, t]))
    const byTeam = new Map<string | null, any[]>()
    byTeam.set(null, [])
    for (const t of teams) byTeam.set(t.id, [])

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

        {teams.map((team) => {
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

        {(byTeam.get(null) ?? []).length > 0 && (
          <div className="space-y-2">
            <span className="text-xs text-white/30">Sem time</span>
            {(byTeam.get(null) ?? []).map((p: any) => (
              <ParticipantRow key={p.id} p={p} eventId={eventId} isOrganizer={isOrganizer} />
            ))}
          </div>
        )}

        <WaitlistSection waitlist={waitlist} teams={teams} />
      </div>
    )
  }

  // Sem times: lista normal + fila abaixo
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

      <WaitlistSection waitlist={waitlist} teams={[]} />
    </div>
  )
}
