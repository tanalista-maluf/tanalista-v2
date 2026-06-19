'use client'

import { useState } from 'react'
import { approveEventJoinRequest, rejectEventJoinRequest } from '../actions'
import { Check, X } from 'lucide-react'

interface Request {
  id: string
  user_id: string
  status: string
  created_at: string
  profiles: { full_name: string | null; username: string | null; avatar_url: string | null } | null
}

interface Props {
  requests: Request[]
  eventId: string
}

export function EventJoinRequests({ requests: initialRequests, eventId }: Props) {
  const [requests, setRequests] = useState(initialRequests)
  const [loading, setLoading] = useState<string | null>(null)

  const pending = requests.filter((r) => r.status === 'PENDING')

  async function handleApprove(requestId: string) {
    setLoading(requestId)
    const result = await approveEventJoinRequest(requestId)
    if (!result?.error) {
      setRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, status: 'APPROVED' } : r))
    }
    setLoading(null)
  }

  async function handleReject(requestId: string) {
    setLoading(requestId)
    const result = await rejectEventJoinRequest(requestId)
    if (!result?.error) {
      setRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, status: 'REJECTED' } : r))
    }
    setLoading(null)
  }

  if (pending.length === 0) {
    return <p className="text-sm text-white/30">Nenhuma solicitação pendente.</p>
  }

  return (
    <div className="space-y-2">
      {pending.map((req) => {
        const name = req.profiles?.full_name ?? req.profiles?.username ?? 'Usuário'
        return (
          <div key={req.id} className="flex items-center gap-3 card-dark rounded-xl p-3">
            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{name}</p>
              {req.profiles?.username && (
                <p className="text-xs text-white/40">@{req.profiles.username}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleApprove(req.id)}
                disabled={loading === req.id}
                className="size-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/25 transition-all disabled:opacity-50"
                title="Aprovar"
              >
                <Check className="size-4" />
              </button>
              <button
                onClick={() => handleReject(req.id)}
                disabled={loading === req.id}
                className="size-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                title="Recusar"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
