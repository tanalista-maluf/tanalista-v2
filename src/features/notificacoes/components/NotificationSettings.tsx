'use client'

import { useEffect, useState, useTransition } from 'react'
import { subscribePushAction, unsubscribePushAction } from '../push'
import { setNotificationPreferenceAction } from '../actions'
import { Bell, Mail, Smartphone, Loader2 } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

interface RowProps {
  icon: React.ReactNode
  label: string
  description: string
  enabled: boolean
  loading: boolean
  onToggle: () => void
}

function NotifRow({ icon, label, description, enabled, loading, onToggle }: RowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${enabled ? 'bg-primary/10 text-primary' : 'bg-white/[0.06] text-white/30'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-tight ${enabled ? 'text-white' : 'text-white/50'}`}>{label}</p>
        <p className="text-xs text-white/30 mt-0.5 truncate">{description}</p>
      </div>
      <button
        onClick={onToggle}
        disabled={loading}
        aria-checked={enabled}
        role="switch"
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
          enabled ? 'bg-primary' : 'bg-white/15'
        }`}
      >
        <span className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-3 text-white/50 animate-spin" />
          </span>
        )}
      </button>
    </div>
  )
}

interface Props {
  initialEmail: boolean
  initialPush: boolean
}

export function NotificationSettings({ initialEmail, initialPush }: Props) {
  const [emailEnabled, setEmailEnabled] = useState(initialEmail)
  const [pushEnabled, setPushEnabled]   = useState(initialPush)
  const [pushSupported, setPushSupported] = useState(false)
  const [browserSubscribed, setBrowserSubscribed] = useState(false)

  const [emailPending, startEmailTransition] = useTransition()
  const [pushPending,  startPushTransition]  = useTransition()

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true)
      navigator.serviceWorker.register('/sw.js').then(async (reg) => {
        const sub = await reg.pushManager.getSubscription()
        setBrowserSubscribed(!!sub)
      })
    }
  }, [])

  function toggleEmail() {
    const next = !emailEnabled
    setEmailEnabled(next)
    startEmailTransition(async () => {
      const res = await setNotificationPreferenceAction('notif_email', next)
      if (res.error) setEmailEnabled(!next)
    })
  }

  function togglePush() {
    startPushTransition(async () => {
      const reg = await navigator.serviceWorker.ready

      if (pushEnabled && browserSubscribed) {
        // Desativar: desinscrever do browser + marcar DB
        const sub = await reg.pushManager.getSubscription()
        if (sub) { await sub.unsubscribe(); await unsubscribePushAction(sub.endpoint) }
        setBrowserSubscribed(false)
        setPushEnabled(false)
        await setNotificationPreferenceAction('notif_push', false)
        return
      }

      // Ativar: pedir permissão → inscrever → salvar
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      const res = await subscribePushAction({ endpoint: json.endpoint, keys: json.keys })
      if (!res.error) {
        setBrowserSubscribed(true)
        setPushEnabled(true)
        await setNotificationPreferenceAction('notif_push', true)
      }
    })
  }

  return (
    <div className="card-dark rounded-2xl divide-y divide-white/[0.06]">
      <NotifRow
        icon={<Mail className="size-4" />}
        label="E-mail"
        description="Confirmações, lembretes e avisos importantes"
        enabled={emailEnabled}
        loading={emailPending}
        onToggle={toggleEmail}
      />
      {pushSupported && (
        <NotifRow
          icon={<Smartphone className="size-4" />}
          label="Notificações no celular"
          description="Lembretes de eventos via notificação push"
          enabled={pushEnabled && browserSubscribed}
          loading={pushPending}
          onToggle={togglePush}
        />
      )}
      {!pushSupported && (
        <div className="flex items-center gap-3 px-4 py-3 opacity-40">
          <div className="size-8 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
            <Smartphone className="size-4 text-white/30" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white/50">Notificações no celular</p>
            <p className="text-xs text-white/25 mt-0.5">Não suportado neste dispositivo</p>
          </div>
        </div>
      )}
    </div>
  )
}
