'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, ChevronDown, ChevronRight } from 'lucide-react'
import { archiveTaskAction, createTaskAction, toggleTaskAction, updateTaskAction } from '../actions'

interface Task {
  id: string
  title: string
  description: string | null
  active: boolean
  archived: boolean
}

interface Props {
  groupId: string
  initialTasks: Task[]
}

// Mini-missões: título e descrição livres, criadas por dono ou gestor.
// Cumprir uma missão garante nota 10 automática (ver completeTaskAction) —
// pode repetir, cada cumprimento soma outro 10 na média do membro.
// Arquivar some com a missão da lista principal (sem apagar cumprimentos
// já dados) — pra missões antigas que não fazem mais sentido reatribuir.
export function TasksManager({ groupId, initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const visible = tasks.filter((t) => !t.archived)
  const archived = tasks.filter((t) => t.archived)

  async function handleCreate() {
    if (!title.trim()) return
    setCreating(true)
    const result = await createTaskAction(groupId, title, description)
    setCreating(false)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setTasks((prev) => [...prev, { ...result.task, archived: false }])
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

  async function handleArchive(task: Task) {
    const nextArchived = !task.archived
    setArchivingId(task.id)
    const result = await archiveTaskAction(groupId, task.id, nextArchived)
    setArchivingId(null)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, archived: nextArchived, active: nextArchived ? false : t.active } : t))
    )
    toast.success(nextArchived ? 'Missão arquivada.' : 'Missão desarquivada.')
  }

  function startEdit(task: Task) {
    setEditingId(task.id)
    setEditTitle(task.title)
    setEditDescription(task.description ?? '')
  }

  async function handleSaveEdit(taskId: string) {
    if (!editTitle.trim()) return
    setSavingEdit(true)
    const result = await updateTaskAction(groupId, taskId, editTitle, editDescription)
    setSavingEdit(false)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    const trimmedTitle = editTitle.trim()
    const trimmedDescription = editDescription.trim() || null
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, title: trimmedTitle, description: trimmedDescription } : t)))
    setEditingId(null)
    toast.success('Mini-missão atualizada.')
  }

  function renderTask(t: Task) {
    if (editingId === t.id) {
      return (
        <div key={t.id} className="card-dark rounded-xl p-3 space-y-2">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            maxLength={80}
            autoFocus
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 h-9 text-sm text-white/80 focus:outline-none focus:border-primary/40"
          />
          <input
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Descrição (opcional)"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 h-9 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-primary/40"
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleSaveEdit(t.id)}
              disabled={savingEdit || !editTitle.trim()}
              className="px-3 h-9 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/25 disabled:opacity-50 transition-colors"
            >
              {savingEdit ? '...' : 'Salvar'}
            </button>
            <button onClick={() => setEditingId(null)} className="text-xs text-white/40 hover:text-white px-1">
              Cancelar
            </button>
          </div>
        </div>
      )
    }

    return (
      <div key={t.id} className="flex items-start gap-3 card-dark rounded-xl p-3">
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${t.active ? 'text-white' : 'text-white/30 line-through'}`}>{t.title}</p>
          {t.description && <p className="text-xs text-white/40 mt-0.5">{t.description}</p>}
        </div>
        <button onClick={() => startEdit(t)} className="shrink-0 text-white/30 hover:text-primary transition-colors" title="Editar">
          <Pencil className="size-3.5" />
        </button>
        {!t.archived && (
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
        )}
        <button
          onClick={() => handleArchive(t)}
          disabled={archivingId === t.id}
          className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60 transition-colors disabled:opacity-50"
        >
          {archivingId === t.id ? '...' : t.archived ? 'Desarquivar' : 'Arquivar'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {visible.length === 0 && <p className="text-sm text-white/30">Nenhuma mini-missão criada ainda.</p>}
      {visible.map(renderTask)}

      {archived.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors py-1"
          >
            {showArchived ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            Arquivadas ({archived.length})
          </button>
          {showArchived && <div className="space-y-2 mt-1">{archived.map(renderTask)}</div>}
        </div>
      )}

      <div className="space-y-2 pt-1">
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
