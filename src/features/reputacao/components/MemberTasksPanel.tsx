'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { completeTaskAction, undoTaskCompletionAction } from '../actions'
import type { TaskRow } from '../queries'

interface Props {
  groupId: string
  memberId: string
  tasks: TaskRow[]
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

// Marcar cumprida soma outra nota 10 na média — pode repetir a mesma
// missão quantas vezes o gestor quiser (ex.: missão mensal).
export function MemberTasksPanel({ groupId, memberId, tasks: initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [markingId, setMarkingId] = useState<string | null>(null)

  const active = tasks.filter((t) => t.active)

  async function handleComplete(taskId: string) {
    setMarkingId(taskId)
    const result = await completeTaskAction(groupId, taskId, memberId)
    setMarkingId(null)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setTasks((prev) =>
      prev.map((t) =>
        t.task_id === taskId
          ? { ...t, completions: [{ id: result.completion.id, completed_at: result.completion.completed_at, marked_by_name: 'Você' }, ...t.completions] }
          : t
      )
    )
    toast.success('Missão marcada como cumprida.')
  }

  async function handleUndo(taskId: string, completionId: string) {
    const result = await undoTaskCompletionAction(groupId, completionId)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setTasks((prev) =>
      prev.map((t) => (t.task_id === taskId ? { ...t, completions: t.completions.filter((c) => c.id !== completionId) } : t))
    )
  }

  if (tasks.length === 0) {
    return <p className="text-sm text-white/30">Nenhuma mini-missão criada no grupo ainda.</p>
  }

  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <div key={t.task_id} className="card-dark rounded-xl p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`text-sm ${t.active ? 'text-white' : 'text-white/30'}`}>{t.title}</p>
              {t.description && <p className="text-xs text-white/40 mt-0.5">{t.description}</p>}
            </div>
            {active.some((a) => a.task_id === t.task_id) && (
              <button
                onClick={() => handleComplete(t.task_id)}
                disabled={markingId === t.task_id}
                className="shrink-0 px-3 h-8 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/25 disabled:opacity-50 transition-colors"
              >
                {markingId === t.task_id ? '...' : 'Marcar cumprida'}
              </button>
            )}
          </div>
          {t.completions.length > 0 && (
            <ul className="space-y-1 pt-1 border-t border-white/[0.06]">
              {t.completions.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-xs text-white/40">
                  <span>
                    Cumprida em {fmtDate(c.completed_at)}{c.marked_by_name ? ` por ${c.marked_by_name}` : ''}
                  </span>
                  <button onClick={() => handleUndo(t.task_id, c.id)} className="text-red-400/70 hover:text-red-400">
                    desfazer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
