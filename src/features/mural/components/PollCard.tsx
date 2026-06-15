'use client'

import { useState, useTransition } from 'react'
import { voteAction, deletePollAction } from '../actions-polls'
import { BarChart2, Trash2, Users } from 'lucide-react'
import type { Poll } from '../queries-polls'

interface Props {
  poll: Poll
  eventId: string
  currentUserId: string
  isOrganizer: boolean
}

export function PollCard({ poll, eventId, currentUserId, isOrganizer }: Props) {
  const [localPoll, setLocalPoll] = useState(poll)
  const [isPending, startTransition] = useTransition()
  const hasVoted = !!localPoll.user_vote_option_id
  const isClosed = localPoll.closes_at ? new Date(localPoll.closes_at) < new Date() : false
  const showResults = hasVoted || isClosed || isOrganizer

  function handleVote(optionId: string) {
    if (hasVoted || isPending || isClosed) return

    // Otimista
    setLocalPoll(prev => ({
      ...prev,
      user_vote_option_id: optionId,
      total_votes: prev.total_votes + 1,
      options: prev.options.map(o =>
        o.id === optionId ? { ...o, vote_count: o.vote_count + 1 } : o
      ),
    }))

    startTransition(async () => {
      const res = await voteAction(poll.id, optionId, eventId)
      if (res.error) {
        // Reverte
        setLocalPoll(poll)
      }
    })
  }

  function handleDelete() {
    startTransition(async () => { await deletePollAction(poll.id, eventId) })
  }

  return (
    <div className="card-dark rounded-2xl p-4 space-y-3 border-l-2 border-l-primary/40">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="size-4 text-primary shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-white leading-snug">{localPoll.question}</p>
        </div>
        {isOrganizer && (
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-white/20 hover:text-red-400 transition-colors shrink-0"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {localPoll.options.map(opt => {
          const pct = localPoll.total_votes > 0
            ? Math.round((opt.vote_count / localPoll.total_votes) * 100)
            : 0
          const isMyVote = localPoll.user_vote_option_id === opt.id

          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              disabled={hasVoted || isClosed || isPending}
              className={`w-full text-left rounded-xl transition-all relative overflow-hidden ${
                hasVoted || isClosed
                  ? 'cursor-default'
                  : 'hover:border-primary/40 hover:bg-white/[0.06] cursor-pointer'
              } ${isMyVote ? 'border border-primary/40' : 'border border-white/[0.08]'}`}
            >
              {/* Barra de progresso */}
              {showResults && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 rounded-xl ${isMyVote ? 'bg-primary/15' : 'bg-white/[0.04]'}`}
                  style={{ width: `${pct}%` }}
                />
              )}

              <div className="relative flex items-center justify-between px-3 py-2.5">
                <span className={`text-sm ${isMyVote ? 'text-primary font-medium' : 'text-white/80'}`}>
                  {opt.text}
                </span>
                {showResults && (
                  <span className={`text-xs font-semibold tabular-nums ${isMyVote ? 'text-primary' : 'text-white/40'}`}>
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-white/25">
        <Users className="size-3" />
        <span>{localPoll.total_votes} voto{localPoll.total_votes !== 1 ? 's' : ''}</span>
        {isClosed && <span className="ml-1 text-red-400/60">· Encerrada</span>}
        {!hasVoted && !isClosed && !isOrganizer && (
          <span className="ml-1">· Toque para votar</span>
        )}
      </div>
    </div>
  )
}
