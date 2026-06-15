'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { postCommentAction, deleteCommentAction } from '../actions'
import { UserAvatar } from '@/components/ui/user-avatar'
import { PollCard } from './PollCard'
import { CreatePollForm } from './CreatePollForm'
import { Trash2, Send, MessageSquare } from 'lucide-react'
import type { Comment } from '../queries'
import type { Poll } from '../queries-polls'

interface Props {
  eventId: string
  currentUserId: string
  isOrganizer: boolean
  initialComments: Comment[]
  initialPolls: Poll[]
}

type FeedItem =
  | { kind: 'comment'; data: Comment }
  | { kind: 'poll'; data: Poll }

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function EventMural({ eventId, currentUserId, isOrganizer, initialComments, initialPolls }: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [polls, setPolls] = useState<Poll[]>(initialPolls)
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Feed unificado ordenado por created_at
  const feed: FeedItem[] = [
    ...comments.map(c => ({ kind: 'comment' as const, data: c })),
    ...polls.map(p => ({ kind: 'poll' as const, data: p })),
  ].sort((a, b) => new Date(a.data.created_at).getTime() - new Date(b.data.created_at).getTime())

  // Realtime: comentários e enquetes
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`mural:${eventId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'event_comments', filter: `event_id=eq.${eventId}` },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username, avatar_url')
            .eq('id', payload.new.user_id)
            .single()
          setComments(prev => [...prev, {
            id: payload.new.id,
            content: payload.new.content,
            created_at: payload.new.created_at,
            user_id: payload.new.user_id,
            profiles: profile ?? null,
          }])
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'event_comments', filter: `event_id=eq.${eventId}` },
        (payload) => setComments(prev => prev.filter(c => c.id !== payload.old.id))
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'event_poll_votes' },
        (payload) => {
          setPolls(prev => prev.map(p => {
            if (p.id !== payload.new.poll_id) return p
            const alreadyHas = p.options.some(o =>
              o.id === payload.new.option_id &&
              p.user_vote_option_id === payload.new.option_id
            )
            if (alreadyHas) return p
            return {
              ...p,
              total_votes: p.total_votes + 1,
              options: p.options.map(o =>
                o.id === payload.new.option_id
                  ? { ...o, vote_count: o.vote_count + 1 }
                  : o
              ),
            }
          }))
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'event_polls', filter: `event_id=eq.${eventId}` },
        async (payload) => {
          // Busca opções do novo poll
          const { data: options } = await supabase
            .from('event_poll_options')
            .select('id, text, position')
            .eq('poll_id', payload.new.id)
            .order('position')
          const newPoll: Poll = {
            id: payload.new.id,
            question: payload.new.question,
            created_at: payload.new.created_at,
            user_id: payload.new.user_id,
            closes_at: payload.new.closes_at ?? null,
            total_votes: 0,
            user_vote_option_id: null,
            options: (options ?? []).map(o => ({ ...o, vote_count: 0 })),
          }
          setPolls(prev => [...prev, newPoll])
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'event_polls', filter: `event_id=eq.${eventId}` },
        (payload) => setPolls(prev => prev.filter(p => p.id !== payload.old.id))
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [feed.length])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || isPending) return
    const content = text.trim()
    setText('')

    const optimistic: Comment = {
      id: `opt-${Date.now()}`,
      content,
      created_at: new Date().toISOString(),
      user_id: currentUserId,
      profiles: null,
    }
    setComments(prev => [...prev, optimistic])

    startTransition(async () => {
      const res = await postCommentAction(eventId, content)
      if (res.error) setComments(prev => prev.filter(c => c.id !== optimistic.id))
    })
    inputRef.current?.focus()
  }

  function handleDeleteComment(commentId: string) {
    setComments(prev => prev.filter(c => c.id !== commentId))
    startTransition(async () => { await deleteCommentAction(commentId, eventId) })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Botão de criar enquete (só organizador) */}
      {isOrganizer && (
        <CreatePollForm
          eventId={eventId}
          onCreated={() => {
            // A nova enquete vai chegar via Realtime ou revalidate
          }}
        />
      )}

      {/* Feed unificado */}
      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
        {feed.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <MessageSquare className="size-8 text-white/15" />
            <p className="text-sm text-white/30">Nenhuma mensagem ainda.</p>
            <p className="text-xs text-white/20">Seja o primeiro a comentar!</p>
          </div>
        ) : (
          feed.map(item => {
            if (item.kind === 'poll') {
              return (
                <PollCard
                  key={`poll-${item.data.id}`}
                  poll={item.data}
                  eventId={eventId}
                  currentUserId={currentUserId}
                  isOrganizer={isOrganizer}
                />
              )
            }

            const c = item.data
            const isMine = c.user_id === currentUserId
            const canDelete = isMine || isOrganizer
            const name = c.profiles?.full_name ?? 'Você'
            const username = c.profiles?.username

            return (
              <div key={`comment-${c.id}`} className={`flex gap-2.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                <div className="shrink-0 mt-0.5">
                  <UserAvatar name={name} avatarUrl={c.profiles?.avatar_url} size="xs" />
                </div>

                <div className={`flex-1 min-w-0 flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-1.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[11px] font-semibold text-white/60 truncate">
                      {isMine ? 'Você' : (username ? `@${username}` : name)}
                    </span>
                    <span className="text-[10px] text-white/25">{timeAgo(c.created_at)}</span>
                  </div>

                  <div className={`flex items-end gap-1.5 group ${isMine ? 'flex-row-reverse' : ''}`}>
                    <div className={`px-3 py-2 rounded-2xl text-sm text-white leading-snug max-w-[260px] break-words ${
                      isMine
                        ? 'bg-primary/20 border border-primary/30 rounded-tr-sm'
                        : 'bg-white/[0.06] border border-white/[0.08] rounded-tl-sm'
                    }`}>
                      {c.content}
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-white/25 hover:text-red-400"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input de comentário */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent) }
          }}
          placeholder="Escreva uma mensagem... (Enter para enviar)"
          rows={1}
          maxLength={500}
          className="flex-1 resize-none rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 px-3 py-2.5 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-colors"
          style={{ minHeight: '42px', maxHeight: '120px', overflowY: 'auto' }}
        />
        <button
          type="submit"
          disabled={!text.trim() || isPending}
          className="size-[42px] shrink-0 rounded-xl bg-primary text-background flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="size-4" />
        </button>
      </form>

      {text.length > 400 && (
        <p className="text-[10px] text-white/30 text-right">{text.length}/500</p>
      )}
    </div>
  )
}
