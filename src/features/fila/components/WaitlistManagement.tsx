import { getWaitlistForEvent } from '@/features/fila/queries'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Clock, Bell } from 'lucide-react'
import { formatDateTime } from '@/utils/format'

interface WaitlistManagementProps {
  eventId: string
}

export async function WaitlistManagement({ eventId }: WaitlistManagementProps) {
  const entries = await getWaitlistForEvent(eventId)

  if (entries.length === 0) {
    return (
      <p className="text-sm text-white/30 text-center py-8">
        Nenhum participante na fila de espera.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const profile = (entry as any).profiles
        const isNotified = entry.status === 'NOTIFIED'

        return (
          <div key={entry.id} className="flex items-center gap-3 p-3 card-dark rounded-xl">
            <span className="text-sm font-mono text-white/30 w-6 text-center shrink-0">
              #{entry.position}
            </span>

            <UserAvatar
              name={profile?.full_name ?? profile?.username ?? '?'}
              avatarUrl={profile?.avatar_url}
              size="sm"
            />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile?.full_name ?? profile?.username ?? 'Usuário'}
              </p>
              {isNotified && entry.expires_at ? (
                <p className="text-xs text-yellow-400 flex items-center gap-1">
                  <Bell className="size-3" />
                  Expira: {formatDateTime(entry.expires_at)}
                </p>
              ) : (
                <p className="text-xs text-white/35 flex items-center gap-1">
                  <Clock className="size-3" />
                  Aguardando vaga
                </p>
              )}
            </div>

            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg border shrink-0 ${
              isNotified
                ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
                : 'text-white/40 bg-white/5 border-white/10'
            }`}>
              {isNotified ? 'Notificado' : 'Aguardando'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
