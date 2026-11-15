'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { rateMemberAction } from '../actions'
import type { CriterionRow } from '../queries'

interface Props {
  groupId: string
  memberId: string
  criteria: CriterionRow[]
}

// Nota de 0 a 10 por critério. Cada gestor só altera a própria nota — a
// média mostrada por critério já soma todo mundo que já votou.
export function MemberCriteriaPanel({ groupId, memberId, criteria: initialCriteria }: Props) {
  const [criteria, setCriteria] = useState(initialCriteria)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const active = criteria.filter((c) => c.active)

  async function handleSave(criterionId: string) {
    const raw = drafts[criterionId]
    const score = Number(raw)
    if (!Number.isInteger(score) || score < 0 || score > 10) {
      toast.error('Informe uma nota inteira de 0 a 10.')
      return
    }
    setSavingId(criterionId)
    const result = await rateMemberAction(groupId, criterionId, memberId, score)
    setSavingId(null)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setCriteria((prev) =>
      prev.map((c) => {
        if (c.criterion_id !== criterionId) return c
        const hadMine = c.my_score !== null
        const votes = hadMine ? c.votes : c.votes + 1
        const sumOthers = (c.average ?? 0) * c.votes - (c.my_score ?? 0)
        const average = (sumOthers + score) / votes
        return { ...c, my_score: score, average, votes }
      })
    )
    setDrafts((prev) => ({ ...prev, [criterionId]: '' }))
    toast.success('Nota salva.')
  }

  if (active.length === 0) {
    return <p className="text-sm text-white/30">Nenhum critério ativo no grupo ainda.</p>
  }

  return (
    <div className="space-y-2">
      {active.map((c) => (
        <div key={c.criterion_id} className="card-dark rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-white">{c.name}</span>
            <span className="text-xs text-white/40 shrink-0">
              {c.average !== null ? `Média: ${c.average.toFixed(1)} (${c.votes})` : 'Sem notas ainda'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={10}
              step={1}
              value={drafts[c.criterion_id] ?? c.my_score ?? ''}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [c.criterion_id]: e.target.value }))}
              placeholder="0-10"
              className="w-20 rounded-lg border border-white/10 bg-white/5 px-3 h-9 text-sm text-white/80 focus:outline-none focus:border-primary/40"
            />
            <button
              onClick={() => handleSave(c.criterion_id)}
              disabled={savingId === c.criterion_id}
              className="px-3 h-9 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/25 disabled:opacity-50 transition-colors"
            >
              {savingId === c.criterion_id ? '...' : c.my_score !== null ? 'Atualizar minha nota' : 'Salvar minha nota'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
