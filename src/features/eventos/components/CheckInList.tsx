import { createAdminClient } from '@/lib/supabase/admin'
import { CheckInRow } from './CheckInRow'
import { ExportCheckInListButton } from './ExportCheckInListButton'

interface Props {
  eventId: string
  eventTitle: string
}

export async function CheckInList({ eventId, eventTitle }: Props) {
  const admin = createAdminClient()

  const { data: participations } = await admin
    .from('participations')
    .select('id, checked_in_at, profiles(full_name, username, avatar_url)')
    .eq('event_id', eventId)
    .eq('status', 'CONFIRMED')
    .order('checked_in_at', { ascending: false, nullsFirst: false })

  if (!participations || participations.length === 0) {
    return (
      <div className="card-dark rounded-2xl p-6 text-center">
        <p className="text-white/40 text-sm">Nenhum participante confirmado ainda.</p>
      </div>
    )
  }

  const checkedIn = participations.filter(p => p.checked_in_at)
  const notCheckedIn = participations.filter(p => !p.checked_in_at)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Lista de presença</p>
        <p className="text-xs text-white/40">
          <span className="text-primary font-semibold">{checkedIn.length}</span>
          <span className="text-white/30"> / {participations.length}</span>
        </p>
      </div>
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-white/30">Sem o QR Code à mão? Toque no nome pra fazer o check-in manualmente.</p>
        <ExportCheckInListButton
          eventTitle={eventTitle}
          participants={[...checkedIn, ...notCheckedIn].map((p) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const raw = p.profiles as any
            const profile = (Array.isArray(raw) ? raw[0] : raw) as { full_name: string | null; username: string | null } | null
            return { name: profile?.full_name ?? 'Participante', username: profile?.username ?? null, checkedIn: !!p.checked_in_at }
          })}
        />
      </div>

      <div className="card-dark rounded-2xl divide-y divide-white/[0.06] overflow-hidden">
        {[...checkedIn, ...notCheckedIn].map((p) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const raw = p.profiles as any
          const profile = (Array.isArray(raw) ? raw[0] : raw) as { full_name: string | null; username: string | null; avatar_url: string | null } | null
          return (
            <CheckInRow
              key={p.id}
              eventId={eventId}
              participationId={p.id}
              name={profile?.full_name ?? 'Participante'}
              username={profile?.username ?? null}
              avatarUrl={profile?.avatar_url ?? null}
              checkedIn={!!p.checked_in_at}
            />
          )
        })}
      </div>
    </div>
  )
}
