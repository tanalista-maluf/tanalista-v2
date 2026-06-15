'use client'

import { useState, useTransition } from 'react'
import { submitRatingAction } from '../actions'
import { Star } from 'lucide-react'
import { UserAvatar } from '@/components/ui/user-avatar'

interface RatingEntry {
  rating: number
  comment: string | null
  created_at: string
  profiles: { full_name: string | null; username: string | null; avatar_url: string | null } | null
}

interface Props {
  eventId: string
  average: number
  count: number
  ratings: RatingEntry[]
  userRating: { rating: number; comment: string } | null
  isParticipant: boolean
}

function StarDisplay({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' }) {
  return (
    <div className={`flex gap-0.5 ${size === 'sm' ? '' : ''}`}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${size === 'sm' ? 'size-3' : 'size-4'} ${i <= value ? 'fill-amber-400 text-amber-400' : 'text-white/15'}`}
        />
      ))}
    </div>
  )
}

export function EventRating({ eventId, average, count, ratings, userRating, isParticipant }: Props) {
  const [hovered, setHovered] = useState(0)
  const [selected, setSelected] = useState(userRating?.rating ?? 0)
  const [comment, setComment] = useState(userRating?.comment ?? '')
  const [submitted, setSubmitted] = useState(!!userRating)
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const showForm = isParticipant && (!submitted || editing)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setError('')
    startTransition(async () => {
      const res = await submitRatingAction(eventId, selected, comment)
      if (res.error) { setError(res.error); return }
      setSubmitted(true)
      setEditing(false)
    })
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {count > 0 && (
        <div className="card-dark rounded-2xl p-4 flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{average.toFixed(1)}</p>
            <StarDisplay value={Math.round(average)} />
            <p className="text-xs text-white/30 mt-1">{count} avaliação{count !== 1 ? 'ões' : ''}</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map(star => {
              const starCount = ratings.filter(r => r.rating === star).length
              const pct = count > 0 ? Math.round((starCount / count) * 100) : 0
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-[10px] text-white/30 w-2">{star}</span>
                  <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-white/25 w-5 text-right">{starCount}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* User rating form */}
      {showForm && (
        <div className="card-dark rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-white">
            {userRating ? 'Sua avaliação' : 'Avaliar evento'}
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(i)}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(0)}
                >
                  <Star className={`size-7 transition-colors ${
                    i <= (hovered || selected) ? 'fill-amber-400 text-amber-400' : 'text-white/20'
                  }`} />
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Comentário opcional (máx. 300 caracteres)"
              maxLength={300}
              rows={3}
              className="w-full resize-none rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 px-3 py-2.5 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2">
              {editing && (
                <button
                  type="button"
                  onClick={() => { setEditing(false); setSelected(userRating?.rating ?? 0); setComment(userRating?.comment ?? '') }}
                  className="flex-1 py-2 rounded-xl text-sm text-white/50 border border-white/10 hover:bg-white/5"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={!selected || isPending}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-primary text-background hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                {isPending ? 'Salvando...' : userRating ? 'Atualizar' : 'Enviar avaliação'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Submitted state */}
      {submitted && !editing && isParticipant && (
        <div className="card-dark rounded-2xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <StarDisplay value={selected} size="sm" />
            <span className="text-xs text-white/40">Sua avaliação</span>
          </div>
          <button onClick={() => setEditing(true)} className="text-xs text-primary hover:underline">
            Editar
          </button>
        </div>
      )}

      {/* Reviews list */}
      {ratings.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-white/30 font-medium uppercase tracking-wide">Avaliações</p>
          {ratings.map((r, i) => (
            <div key={i} className="card-dark rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <UserAvatar
                    name={r.profiles?.full_name ?? 'Usuário'}
                    avatarUrl={r.profiles?.avatar_url}
                    size="xs"
                  />
                  <span className="text-xs text-white/60">
                    {r.profiles?.username ? `@${r.profiles.username}` : r.profiles?.full_name ?? 'Usuário'}
                  </span>
                </div>
                <StarDisplay value={r.rating} size="sm" />
              </div>
              {r.comment && (
                <p className="text-xs text-white/50 pl-7">{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {count === 0 && !isParticipant && (
        <div className="text-center py-8 text-white/25 text-sm">
          Nenhuma avaliação ainda.
        </div>
      )}
    </div>
  )
}
