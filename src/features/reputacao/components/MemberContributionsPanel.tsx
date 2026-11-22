'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createContributionAction, deleteContributionAction } from '../actions'
import type { ContributionRow } from '../queries'

const SIZE_LABELS: Record<string, string> = { PEQUENA: 'Pequena', MEDIA: 'Média', GRANDE: 'Grande' }
const SIZE_STYLES: Record<string, string> = {
  PEQUENA: 'text-primary/80 bg-primary/10 border-primary/25',
  MEDIA: 'text-primary bg-primary/15 border-primary/30',
  GRANDE: 'text-emerald-300 bg-emerald-400/15 border-emerald-400/30',
}
const SIZES = ['PEQUENA', 'MEDIA', 'GRANDE'] as const

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

interface Props {
  groupId: string
  memberId: string
  contributions: ContributionRow[]
}

// Registro de contribuições de um membro: dono ou gestor escolhe o porte,
// escreve a justificativa (o que foi feito), e fica no histórico. Sem
// edição — só registrar e, se foi engano, excluir.
export function MemberContributionsPanel({ groupId, memberId, contributions: initialContributions }: Props) {
  const [contributions, setContributions] = useState(initialContributions)
  const [size, setSize] = useState<typeof SIZES[number]>('PEQUENA')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (description.trim().length < 3) {
      toast.error('Descreva a contribuição (mínimo 3 caracteres).')
      return
    }
    setSaving(true)
    const result = await createContributionAction(groupId, memberId, size, description)
    setSaving(false)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setContributions((prev) => [
      { id: result.contribution.id, size: result.contribution.size as ContributionRow['size'], description: result.contribution.description, created_at: result.contribution.created_at, created_by_name: 'Você' },
      ...prev,
    ])
    setDescription('')
    toast.success('Contribuição registrada.')
  }

  async function handleDelete(id: string) {
    const result = await deleteContributionAction(groupId, id)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setContributions((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-3">
      <div className="card-dark rounded-xl p-3 space-y-2">
        <div className="flex gap-2">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`flex-1 h-9 rounded-lg border text-xs font-semibold transition-colors ${
                size === s ? SIZE_STYLES[s] : 'text-white/40 bg-white/5 border-white/10 hover:text-white/60'
              }`}
            >
              {SIZE_LABELS[s]}
            </button>
          ))}
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Justificativa — o que foi feito"
          rows={2}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-primary/40 resize-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving}
          className="w-full h-9 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/25 disabled:opacity-50 transition-colors"
        >
          {saving ? '...' : 'Registrar contribuição'}
        </button>
      </div>

      {contributions.length === 0 ? (
        <p className="text-sm text-white/30">Nenhuma contribuição registrada.</p>
      ) : (
        <ul className="space-y-2">
          {contributions.map((c) => (
            <li key={c.id} className="card-dark rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${SIZE_STYLES[c.size]}`}>
                  {SIZE_LABELS[c.size]}
                </span>
                <button type="button" onClick={() => handleDelete(c.id)} className="text-xs text-red-400/70 hover:text-red-400">
                  excluir
                </button>
              </div>
              <p className="text-sm text-white/80">{c.description}</p>
              <p className="text-xs text-white/30">
                {fmtDateTime(c.created_at)}{c.created_by_name ? ` · ${c.created_by_name}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
