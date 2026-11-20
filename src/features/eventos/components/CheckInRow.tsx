'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { checkInAction } from '../actions-checkin'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { UserAvatar } from '@/components/ui/user-avatar'

interface Props {
  eventId: string
  participationId: string
  name: string
  username: string | null
  avatarUrl: string | null
  checkedIn: boolean
}

// Mesma ação do scanner de QR Code (checkInAction só precisa do id da
// participação) — toca na linha pra marcar presença manualmente, pra quando
// o participante não tem o QR à mão.
export function CheckInRow({ eventId, participationId, name, username, avatarUrl, checkedIn: initialCheckedIn }: Props) {
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn)
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (checkedIn || pending) return
    startTransition(async () => {
      const result = await checkInAction(eventId, participationId)
      if (!result.success) {
        toast.error(result.error ?? 'Erro ao registrar check-in')
        return
      }
      setCheckedIn(true)
      toast.success(`Check-in de ${name} confirmado.`)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={checkedIn || pending}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors enabled:hover:bg-white/[0.03] disabled:cursor-default"
    >
      <UserAvatar name={name} avatarUrl={avatarUrl} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{name}</p>
        {username && <p className="text-xs text-white/35 truncate">@{username}</p>}
      </div>
      {pending ? (
        <Loader2 className="size-5 text-white/40 animate-spin shrink-0" />
      ) : checkedIn ? (
        <CheckCircle2 className="size-5 text-primary shrink-0" />
      ) : (
        <XCircle className="size-5 text-white/25 shrink-0" />
      )}
    </button>
  )
}
