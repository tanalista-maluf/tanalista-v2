'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, CheckCheck, Calendar, Users, Wallet, AlertCircle } from 'lucide-react'
import { formatDateTime } from '@/utils/format'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { markNotificationReadAction, markAllReadAction } from '@/features/notificacoes/actions'

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
  WAITLIST_PROMOTED:       Calendar,
  PARTICIPATION_CONFIRMED: CheckCheck,
  EVENT_CANCELLED:         AlertCircle,
  WAITLIST_CONFIRMED:      Users,
  PAYMENT_RECEIVED:        Wallet,
}

function getLink(n: Notification): string | null {
  if (n.data?.event_id) return `/eventos/${n.data.event_id}`
  return null
}

interface Props {
  initialCount: number
}

export function NotificationBell({ initialCount }: Props) {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleOpen() {
    if (open) { setOpen(false); return }
    setOpen(true)
    if (loaded) return
    setLoading(true)
    const res = await fetch('/api/notificacoes')
    const data = await res.json()
    setNotifications(data)
    setLoaded(true)
    setLoading(false)
  }

  async function handleRead(id: string) {
    await markNotificationReadAction(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setCount(prev => Math.max(0, prev - 1))
  }

  async function handleMarkAll() {
    await markAllReadAction()
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setCount(0)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center hover:bg-primary/15 transition-colors"
        aria-label="Notificações"
      >
        <Bell className="size-4 text-primary" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 max-h-[70vh] flex flex-col rounded-2xl border border-white/[0.08] bg-[#0d1a14] shadow-2xl shadow-black/50 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
            <span className="text-sm font-semibold text-white">Notificações</span>
            <div className="flex items-center gap-3">
              {count > 0 && (
                <button onClick={handleMarkAll} className="text-[11px] text-primary hover:text-primary/70 transition-colors">
                  Marcar todas como lidas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white transition-colors">
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {loading && (
              <div className="py-10 text-center text-sm text-white/30">Carregando...</div>
            )}
            {!loading && notifications.length === 0 && loaded && (
              <div className="py-10 text-center space-y-2">
                <Bell className="size-8 mx-auto text-white/15" />
                <p className="text-sm text-white/30">Nenhuma notificação ainda.</p>
              </div>
            )}
            {!loading && notifications.map((n) => {
              const Icon = TYPE_ICON[n.type] ?? Bell
              const href = getLink(n)
              const inner = (
                <div
                  onClick={() => { if (!n.read) handleRead(n.id) }}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] transition-colors cursor-pointer hover:bg-white/[0.04]',
                    !n.read && 'bg-primary/[0.04]'
                  )}
                >
                  <div className={cn('size-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5', n.read ? 'bg-white/5' : 'bg-primary/10')}>
                    <Icon className={cn('size-3.5', n.read ? 'text-white/30' : 'text-primary')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={cn('text-xs font-semibold truncate', n.read ? 'text-white/50' : 'text-white')}>{n.title}</p>
                      {!n.read && <span className="size-1.5 rounded-full bg-primary shrink-0" />}
                    </div>
                    {n.body && <p className="text-[11px] text-white/40 mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-white/25 mt-1">{formatDateTime(n.created_at)}</p>
                  </div>
                </div>
              )
              return href
                ? <Link key={n.id} href={href} onClick={() => setOpen(false)}>{inner}</Link>
                : <div key={n.id}>{inner}</div>
            })}
          </div>
        </div>
      )}
    </div>
  )
}
