import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNotifications } from '@/features/notificacoes/queries'
import { NotificationItem } from '@/features/notificacoes/components/NotificationItem'
import { markAllReadAction } from '@/features/notificacoes/actions'
import { Bell } from 'lucide-react'

export default async function NotificacoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const notifications = await getNotifications(50)
  const unread = notifications.filter((n) => !n.read).length

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
            Notificações
          </h1>
          {unread > 0 && (
            <p className="text-sm text-white/40 mt-0.5">{unread} não lida{unread > 1 ? 's' : ''}</p>
          )}
        </div>
        {unread > 0 && (
          <form action={async () => { 'use server'; await markAllReadAction() }}>
            <button
              type="submit"
              className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
            >
              Marcar todas como lidas
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-white/20">
          <Bell className="size-12" />
          <p className="text-sm">Nenhuma notificação ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n as any} />
          ))}
        </div>
      )}
    </main>
  )
}
