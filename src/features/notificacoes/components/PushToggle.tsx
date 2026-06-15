'use client'

import { useEffect, useState, useTransition } from 'react'
import { subscribePushAction, unsubscribePushAction } from '../push'
import { Bell, BellOff, Loader2 } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function PushToggle() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setSupported(true)
      navigator.serviceWorker.register('/sw.js').then(async (reg) => {
        const sub = await reg.pushManager.getSubscription()
        setSubscribed(!!sub)
      })
    }
  }, [])

  if (!supported) return null

  function handleToggle() {
    startTransition(async () => {
      const reg = await navigator.serviceWorker.ready

      if (subscribed) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await sub.unsubscribe()
          await unsubscribePushAction(sub.endpoint)
        }
        setSubscribed(false)
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      const res = await subscribePushAction({ endpoint: json.endpoint, keys: json.keys })

      if (!res.error) setSubscribed(true)
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl border transition-colors ${
        subscribed
          ? 'bg-primary/10 border-primary/20 text-primary'
          : 'card-dark border-white/10 text-white/60 hover:text-white hover:border-white/20'
      }`}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin shrink-0" />
      ) : subscribed ? (
        <Bell className="size-4 shrink-0" />
      ) : (
        <BellOff className="size-4 shrink-0" />
      )}
      <div className="text-left flex-1">
        <p className="text-sm font-medium leading-tight">
          {subscribed ? 'Notificações ativas' : 'Ativar notificações'}
        </p>
        <p className="text-xs text-white/35 mt-0.5">
          {subscribed
            ? 'Você receberá lembretes e atualizações'
            : 'Receba lembretes de eventos no celular'}
        </p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full ${subscribed ? 'bg-primary/20 text-primary' : 'bg-white/[0.06] text-white/30'}`}>
        {subscribed ? 'ON' : 'OFF'}
      </span>
    </button>
  )
}
