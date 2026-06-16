import { createAdminClient } from '@/lib/supabase/admin'
import { CheckCircle2, XCircle } from 'lucide-react'
import { UserAvatar } from '@/components/ui/user-avatar'

interface Props {
  eventId: string
}

export async function CheckInList({ eventId }: Props) {
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

      <div className="card-dark rounded-2xl divide-y divide-white/[0.06] overflow-hidden">
        {[...checkedIn, ...notCheckedIn].map((p) => {
          const profile = p.profiles as { full_name: string | null; username: string | null; avatar_url: string | null } | null
          const done = !!p.checked_in_at
          return (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <UserAvatar
                name={profile?.full_name ?? '?'}
                avatarUrl={profile?.avatar_url}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {profile?.full_name ?? 'Participante'}
                </p>
                {profile?.username && (
                  <p className="text-xs text-white/35 truncate">@{profile.username}</p>
                )}
              </div>
              {done ? (
                <CheckCircle2 className="size-5 text-primary shrink-0" />
              ) : (
                <XCircle className="size-5 text-white/25 shrink-0" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
