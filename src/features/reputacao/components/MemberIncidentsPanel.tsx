'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createIncidentAction, deleteIncidentAction } from '../actions'
import type { IncidentRow } from '../queries'

const SEVERITY_LABELS: Record<string, string> = { LEVE: 'Leve', MEDIA: 'Média', GRAVE: 'Grave' }
const SEVERITY_STYLES: Record<string, string> = {
  LEVE: 'text-yellow-300 bg-yellow-400/10 border-yellow-400/25',
  MEDIA: 'text-orange-300 bg-orange-400/10 border-orange-400/25',
  GRAVE: 'text-red-400 bg-red-400/10 border-red-400/25',
}
const SEVERITIES = ['LEVE', 'MEDIA', 'GRAVE'] as const

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

interface Props {
  groupId: string
  memberId: string
  incidents: IncidentRow[]
}

// Registro de faltas de um membro: dono ou gestor escolhe a gravidade,
// escreve a justificativa, e fica no histórico pra decidir sobre casos
// recorrentes. Sem edição — só registrar e, se foi engano, excluir.
export function MemberIncidentsPanel({ groupId, memberId, incidents: initialIncidents }: Props) {
  const [incidents, setIncidents] = useState(initialIncidents)
  const [severity, setSeverity] = useState<typeof SEVERITIES[number]>('LEVE')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (description.trim().length < 3) {
      toast.error('Descreva a falta (mínimo 3 caracteres).')
      return
    }
    setSaving(true)
    const result = await createIncidentAction(groupId, memberId, severity, description)
    setSaving(false)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setIncidents((prev) => [
      { id: result.incident.id, severity: result.incident.severity as IncidentRow['severity'], description: result.incident.description, created_at: result.incident.created_at, created_by_name: 'Você' },
      ...prev,
    ])
    setDescription('')
    toast.success('Falta registrada.')
  }

  async function handleDelete(id: string) {
    const result = await deleteIncidentAction(groupId, id)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setIncidents((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <div className="space-y-3">
      <div className="card-dark rounded-xl p-3 space-y-2">
        <div className="flex gap-2">
          {SEVERITIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeverity(s)}
              className={`flex-1 h-9 rounded-lg border text-xs font-semibold transition-colors ${
                severity === s ? SEVERITY_STYLES[s] : 'text-white/40 bg-white/5 border-white/10 hover:text-white/60'
              }`}
            >
              {SEVERITY_LABELS[s]}
            </button>
          ))}
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Justificativa — o que aconteceu"
          rows={2}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-primary/40 resize-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving}
          className="w-full h-9 rounded-lg bg-red-400/15 border border-red-400/30 text-red-400 text-xs font-semibold hover:bg-red-400/25 disabled:opacity-50 transition-colors"
        >
          {saving ? '...' : 'Registrar falta'}
        </button>
      </div>

      {incidents.length === 0 ? (
        <p className="text-sm text-white/30">Nenhuma falta registrada.</p>
      ) : (
        <ul className="space-y-2">
          {incidents.map((i) => (
            <li key={i.id} className="card-dark rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${SEVERITY_STYLES[i.severity]}`}>
                  {SEVERITY_LABELS[i.severity]}
                </span>
                <button type="button" onClick={() => handleDelete(i.id)} className="text-xs text-red-400/70 hover:text-red-400">
                  excluir
                </button>
              </div>
              <p className="text-sm text-white/80">{i.description}</p>
              <p className="text-xs text-white/30">
                {fmtDateTime(i.created_at)}{i.created_by_name ? ` · ${i.created_by_name}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
