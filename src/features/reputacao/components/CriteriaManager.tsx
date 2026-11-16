'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { createCriterionAction, toggleCriterionAction, updateCriterionAction } from '../actions'

interface Criterion {
  id: string
  name: string
  active: boolean
}

interface Props {
  groupId: string
  initialCriteria: Criterion[]
  isOwner: boolean
}

// Critérios de avaliação: campo aberto, só o dono do grupo cria, edita e
// desativa. Editar o texto (ex.: corrigir grafia) não mexe nas notas já
// dadas. Desativar não apaga notas — só esconde o critério de novas
// avaliações.
export function CriteriaManager({ groupId, initialCriteria, isOwner }: Props) {
  const [criteria, setCriteria] = useState(initialCriteria)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setCreating(true)
    const result = await createCriterionAction(groupId, name)
    setCreating(false)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setCriteria((prev) => [...prev, result.criterion])
    setName('')
    toast.success('Critério criado.')
  }

  async function handleToggle(criterion: Criterion) {
    setTogglingId(criterion.id)
    const result = await toggleCriterionAction(groupId, criterion.id, !criterion.active)
    setTogglingId(null)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setCriteria((prev) => prev.map((c) => (c.id === criterion.id ? { ...c, active: !c.active } : c)))
  }

  function startEdit(criterion: Criterion) {
    setEditingId(criterion.id)
    setEditValue(criterion.name)
  }

  async function handleSaveEdit(criterionId: string) {
    if (!editValue.trim()) return
    setSavingEdit(true)
    const result = await updateCriterionAction(groupId, criterionId, editValue)
    setSavingEdit(false)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    const trimmed = editValue.trim()
    setCriteria((prev) => prev.map((c) => (c.id === criterionId ? { ...c, name: trimmed } : c)))
    setEditingId(null)
    toast.success('Critério atualizado.')
  }

  return (
    <div className="space-y-2">
      {criteria.length === 0 && <p className="text-sm text-white/30">Nenhum critério criado ainda.</p>}
      {criteria.map((c) =>
        editingId === c.id ? (
          <div key={c.id} className="flex items-center gap-2 card-dark rounded-xl p-3">
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              maxLength={60}
              autoFocus
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 h-9 text-sm text-white/80 focus:outline-none focus:border-primary/40"
            />
            <button
              onClick={() => handleSaveEdit(c.id)}
              disabled={savingEdit || !editValue.trim()}
              className="px-3 h-9 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/25 disabled:opacity-50 transition-colors"
            >
              {savingEdit ? '...' : 'Salvar'}
            </button>
            <button onClick={() => setEditingId(null)} className="text-xs text-white/40 hover:text-white px-1">
              Cancelar
            </button>
          </div>
        ) : (
          <div key={c.id} className="flex items-center gap-3 card-dark rounded-xl p-3">
            <span className={`flex-1 text-sm ${c.active ? 'text-white' : 'text-white/30 line-through'}`}>{c.name}</span>
            {isOwner && (
              <>
                <button onClick={() => startEdit(c)} className="text-white/30 hover:text-primary transition-colors" title="Editar">
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => handleToggle(c)}
                  disabled={togglingId === c.id}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    c.active
                      ? 'bg-primary/10 text-primary hover:bg-red-400/10 hover:text-red-400'
                      : 'bg-white/5 text-white/30 hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  {togglingId === c.id ? '...' : c.active ? 'Ativo' : 'Inativo'}
                </button>
              </>
            )}
          </div>
        )
      )}
      {isOwner && (
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do critério (ex.: Pontualidade)"
            maxLength={60}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 h-10 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-primary/40"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="px-4 h-10 rounded-xl bg-primary/15 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/25 disabled:opacity-50 transition-colors"
          >
            {creating ? '...' : 'Adicionar'}
          </button>
        </div>
      )}
    </div>
  )
}
