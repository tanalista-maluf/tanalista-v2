import { Bell } from 'lucide-react'
import Link from 'next/link'
import { getUnreadCount } from '@/features/notificacoes/queries'

export async function NotificationBell() {
  const count = await getUnreadCount()

  return (
    <Link
      href="/notificacoes"
      className="relative size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center hover:bg-primary/15 transition-colors"
      aria-label="Notificações"
    >
      <Bell className="size-4 text-primary" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center leading-none">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
