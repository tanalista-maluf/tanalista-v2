'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { addMemberFieldEntryAction, deleteMemberFieldEntryAction } from '../actions'
import type { MemberFieldRow } from '../queries'

interface Props {
  groupId: string
  memberId: string
  fields: MemberFieldRow[]
}

function fmtDate(iso: string) {
  // recorded_at é DATE (sem hora): não passa por fuso, lê os dígitos direto
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

// Histórico datado por campo (ex.: cronagem ao longo do tempo), não só o
// valor mais recente.
export function MemberFieldsPanel({ groupId, memberId, fields: initialFields }: Props) {
  const [fields, setFields] = useState(initialFields)
  const [drafts, setDrafts] = useState<Record<string, { value: string; date: string }>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  function draftFor(fieldId: string) {
    return drafts[fieldId] ?? { value: '', date: todayInput() }
  }

  async function handleAdd(fieldId: string) {
    const draft = draftFor(fieldId)
    if (!draft.value.trim()) {
      toast.error('Informe o valor.')
      return
    }
    setSavingId(fieldId)
    const result = await addMemberFieldEntryAction(groupId, fieldId, memberId, draft.value, draft.date)
    setSavingId(null)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setFields((prev) =>
      prev.map((f) =>
        f.field_id === fieldId
          ? {
              ...f,
              entries: [
                { id: result.entry.id, value: result.entry.value, recorded_at: result.entry.recorded_at, recorded_by_name: 'Você' },
                ...f.entries,
              ],
            }
          : f
      )
    )
    setDrafts((prev) => ({ ...prev, [fieldId]: { value: '', date: todayInput() } }))
    toast.success('Registro salvo.')
  }

  async function handleDelete(fieldId: string, entryId: string) {
    const result = await deleteMemberFieldEntryAction(groupId, entryId)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setFields((prev) =>
      prev.map((f) => (f.field_id === fieldId ? { ...f, entries: f.entries.filter((e) => e.id !== entryId) } : f))
    )
  }

  if (fields.length === 0) {
    return <p className="text-sm text-white/30">O grupo não cadastrou campos customizados.</p>
  }

  return (
    <div className="space-y-3">
      {fields.map((f) => {
        const draft = draftFor(f.field_id)
        return (
          <div key={f.field_id} className="card-dark rounded-xl p-3 space-y-2">
            <p className="text-sm text-white">
              {f.label}
              {f.unit && <span className="text-white/40"> ({f.unit})</span>}
            </p>
            {f.entries.length > 0 && (
              <ul className="space-y-1">
                {f.entries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between text-xs text-white/50">
                    <span>
                      <strong className="text-white/80">{e.value}{f.unit ? ` ${f.unit}` : ''}</strong>{' '}
                      em {fmtDate(e.recorded_at)}{e.recorded_by_name ? ` · ${e.recorded_by_name}` : ''}
                    </span>
                    <button onClick={() => handleDelete(f.field_id, e.id)} className="text-red-400/70 hover:text-red-400">
                      excluir
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {f.active && (
              <div className="flex gap-2 pt-1">
                <input
                  value={draft.value}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [f.field_id]: { ...draft, value: e.target.value } }))}
                  placeholder={`Valor${f.unit ? ` (${f.unit})` : ''}`}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 h-9 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-primary/40"
                />
                <input
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [f.field_id]: { ...draft, date: e.target.value } }))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 h-9 text-sm text-white/80 focus:outline-none focus:border-primary/40"
                />
                <button
                  onClick={() => handleAdd(f.field_id)}
                  disabled={savingId === f.field_id}
                  className="px-3 h-9 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/25 disabled:opacity-50 transition-colors"
                >
                  {savingId === f.field_id ? '...' : 'Adicionar'}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
