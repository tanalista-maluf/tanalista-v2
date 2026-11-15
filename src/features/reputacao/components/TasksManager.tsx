'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createTaskAction, toggleTaskAction } from '../actions'

interface Task {
  id: string
  title: string
  description: string | null
  active: boolean
}

interface Props {
  groupId: string
  initialTasks: Task[]
}

// Mini-missões: título e descrição livres, criadas por dono ou gestor.
// Cumprir uma missão garante nota 10 automática (ver completeTaskAction) —
// pode repetir, cada cumprimento soma outro 10 na média do membro.
export function TasksManager({ groupId, initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function handleCreate() {
    if (!title.trim()) return
    setCreating(true)
    const result = await createTaskAction(groupId, title, description)
    setCreating(false)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setTasks((prev) => [...prev, result.task])
    setTitle('')
    setDescription('')
    toast.success('Mini-missão criada.')
  }

  async function handleToggle(task: Task) {
    setTogglingId(task.id)
    const result = await toggleTaskAction(groupId, task.id, !task.active)
    setTogglingId(null)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, active: !t.active } : t)))
  }

  return (
    <div className="space-y-2">
      {tasks.length === 0 && <p className="text-sm text-white/30">Nenhuma mini-missão criada ainda.</p>}
      {tasks.map((t) => (
        <div key={t.id} className="flex items-start gap-3 card-dark rounded-xl p-3">
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${t.active ? 'text-white' : 'text-white/30 line-through'}`}>{t.title}</p>
            {t.description && <p className="text-xs text-white/40 mt-0.5">{t.description}</p>}
          </div>
          <button
            onClick={() => handleToggle(t)}
            disabled={togglingId === t.id}
            className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
              t.active
                ? 'bg-primary/10 text-primary hover:bg-red-400/10 hover:text-red-400'
                : 'bg-white/5 text-white/30 hover:bg-primary/10 hover:text-primary'
            }`}
          >
            {togglingId === t.id ? '...' : t.active ? 'Ativa' : 'Inativa'}
          </button>
        </div>
      ))}
      <div className="space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título da missão (ex.: Trazer água extra para o grupo)"
          maxLength={80}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 h-10 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-primary/40"
        />
        <div className="flex gap-2">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição (opcional)"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 h-10 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-primary/40"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !title.trim()}
            className="px-4 h-10 rounded-xl bg-primary/15 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/25 disabled:opacity-50 transition-colors"
          >
            {creating ? '...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}
