'use client'

import { Bell, CheckCheck, Calendar, Users, Wallet, AlertCircle } from 'lucide-react'
import { markNotificationReadAction } from '@/features/notificacoes/actions'
import { formatDateTime } from '@/utils/format'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  read: boolean
  data: Record<string, string> | null
  created_at: string
}

const TYPE_ICON: Record<string, typeof Bell> = {
  NEW_EVENT:              Calendar,
  WAITLIST_PROMOTED:      Calendar,
  PARTICIPATION_CONFIRMED: CheckCheck,
  EVENT_CANCELLED:        AlertCircle,
  WAITLIST_CONFIRMED:     Users,
  PAYMENT_RECEIVED:       Wallet,
}

function getLink(notification: Notification): string | null {
  const d = notification.data
  if (!d) return null
  if (d.event_id) return `/eventos/${d.event_id}`
  return null
}

export function NotificationItem({ notification }: { notification: Notification }) {
  const Icon = TYPE_ICON[notification.type] ?? Bell
  const href = getLink(notification)

  async function handleRead() {
    if (!notification.read) {
      await markNotificationReadAction(notification.id)
    }
  }

  const inner = (
    <div
      onClick={handleRead}
      className={cn(
        'flex items-start gap-3 p-4 rounded-2xl border transition-colors cursor-pointer',
        notification.read
          ? 'bg-white/[0.03] border-white/[0.06] opacity-60'
          : 'bg-white/[0.06] border-primary/20'
      )}
    >
      <div className={cn(
        'size-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
        notification.read ? 'bg-white/[0.05]' : 'bg-primary/10'
      )}>
        <Icon className={cn('size-4', notification.read ? 'text-white/30' : 'text-primary')} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn('text-sm font-semibold truncate', notification.read ? 'text-white/50' : 'text-white')}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="size-2 rounded-full bg-primary shrink-0" />
          )}
        </div>
        {notification.body && (
          <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{notification.body}</p>
        )}
        <p className="text-[10px] text-white/25 mt-1">{formatDateTime(notification.created_at)}</p>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href} className="block">{inner}</Link>
  }

  return inner
}
