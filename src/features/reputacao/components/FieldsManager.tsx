'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createMemberFieldAction, toggleMemberFieldAction } from '../actions'

interface Field {
  id: string
  label: string
  unit: string | null
  active: boolean
}

interface Props {
  groupId: string
  initialFields: Field[]
  isOwner: boolean
}

// Campos customizados por grupo (ex.: "Cronagem", unidade "m/s"): o grupo
// define o que quer acompanhar, cada medição vira um registro datado no
// perfil do membro (ver MemberFieldsPanel). Deixar sem nenhum campo
// cadastrado é a opção de não usar esta função.
export function FieldsManager({ groupId, initialFields, isOwner }: Props) {
  const [fields, setFields] = useState(initialFields)
  const [label, setLabel] = useState('')
  const [unit, setUnit] = useState('')
  const [creating, setCreating] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function handleCreate() {
    if (!label.trim()) return
    setCreating(true)
    const result = await createMemberFieldAction(groupId, label, unit)
    setCreating(false)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setFields((prev) => [...prev, result.field])
    setLabel('')
    setUnit('')
    toast.success('Campo criado.')
  }

  async function handleToggle(field: Field) {
    setTogglingId(field.id)
    const result = await toggleMemberFieldAction(groupId, field.id, !field.active)
    setTogglingId(null)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setFields((prev) => prev.map((f) => (f.id === field.id ? { ...f, active: !f.active } : f)))
  }

  return (
    <div className="space-y-2">
      {fields.length === 0 && <p className="text-sm text-white/30">Nenhum campo customizado criado ainda.</p>}
      {fields.map((f) => (
        <div key={f.id} className="flex items-center gap-3 card-dark rounded-xl p-3">
          <span className={`flex-1 text-sm ${f.active ? 'text-white' : 'text-white/30 line-through'}`}>
            {f.label}
            {f.unit && <span className="text-white/40"> ({f.unit})</span>}
          </span>
          {isOwner && (
            <button
              onClick={() => handleToggle(f)}
              disabled={togglingId === f.id}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                f.active
                  ? 'bg-primary/10 text-primary hover:bg-red-400/10 hover:text-red-400'
                  : 'bg-white/5 text-white/30 hover:bg-primary/10 hover:text-primary'
              }`}
            >
              {togglingId === f.id ? '...' : f.active ? 'Ativo' : 'Inativo'}
            </button>
          )}
        </div>
      ))}
      {isOwner && (
        <div className="flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nome do campo (ex.: Cronagem)"
            maxLength={60}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 h-10 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-primary/40"
          />
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Unidade (opcional, ex.: m/s)"
            maxLength={20}
            className="w-40 rounded-xl border border-white/10 bg-white/5 px-3 h-10 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-primary/40"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !label.trim()}
            className="px-4 h-10 rounded-xl bg-primary/15 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/25 disabled:opacity-50 transition-colors"
          >
            {creating ? '...' : 'Adicionar'}
          </button>
        </div>
      )}
    </div>
  )
}
