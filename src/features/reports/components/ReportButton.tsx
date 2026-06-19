'use client'

import { useState, useTransition } from 'react'
import { Flag, X, Loader2, CheckCircle } from 'lucide-react'
import { submitReportAction } from '../actions'

const REASONS = [
  { value: 'SPAM', label: 'Spam ou propaganda' },
  { value: 'INAPPROPRIATE', label: 'Conteúdo inapropriado' },
  { value: 'FAKE', label: 'Informação falsa ou enganosa' },
  { value: 'DANGEROUS', label: 'Conteúdo perigoso' },
  { value: 'OTHER', label: 'Outro motivo' },
]

interface Props {
  targetType: 'EVENT' | 'GROUP'
  targetId: string
}

export function ReportButton({ targetType, targetId }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!reason) return
    startTransition(async () => {
      const result = await submitReportAction(targetType, targetId, reason, description)
      if (result.error) {
        setError(result.error)
      } else {
        setDone(true)
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-white/20 hover:text-red-400/60 transition-colors"
      >
        <Flag className="size-3" />
        Denunciar
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !isPending && setOpen(false)}>
      <div className="w-full max-w-sm bg-[#0D1A14] border border-white/10 rounded-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="size-4 text-red-400" />
            <p className="font-semibold text-white text-sm">Denunciar conteúdo</p>
          </div>
          <button onClick={() => setOpen(false)} disabled={isPending} className="text-white/30 hover:text-white">
            <X className="size-4" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle className="size-10 text-primary" />
            <p className="text-sm text-white/70 text-center">Denúncia enviada. Nossa equipe irá analisar em breve.</p>
            <button onClick={() => setOpen(false)} className="text-xs text-white/40 hover:text-white transition-colors">Fechar</button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-xs text-white/40">Qual é o motivo da denúncia?</p>
              <div className="space-y-1.5">
                {REASONS.map(r => (
                  <label key={r.value} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="accent-red-400"
                    />
                    <span className={`text-sm transition-colors ${reason === r.value ? 'text-white' : 'text-white/50 group-hover:text-white/70'}`}>
                      {r.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-white/40">Descrição (opcional)</p>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Descreva o problema com mais detalhes..."
                maxLength={500}
                rows={3}
                className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-red-500/40 resize-none transition-colors"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="flex-1 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-white/60 text-sm font-medium hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason || isPending}
                className="flex-1 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Flag className="size-4" />}
                Enviar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
