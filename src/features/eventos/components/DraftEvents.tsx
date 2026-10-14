'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FilePen, Loader2, Repeat, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteDraftEventAction, publishEventAction } from '../actions'

export type DraftEvent = {
  id: string
  slug: string | null
  title: string
  starts_at: string
  city: string
  rule: string | null
  seriesSize: number
}

function repeatLabel(rule: string | null) {
  if (!rule) return ''
  if (rule.includes('MONTHLY')) return 'todo mês'
  return rule.includes('INTERVAL=2') ? 'a cada 2 semanas' : 'toda semana'
}

// Rascunhos do organizador: só ele vê. Uma série recorrente aparece como um
// item só; publicar ou excluir vale para a série toda.
export function DraftEvents({ drafts }: { drafts: DraftEvent[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  if (drafts.length === 0) return null

  async function publish(draft: DraftEvent) {
    setBusy(draft.id)
    const result = await publishEventAction(draft.id)
    setBusy(null)
    if ('error' in result) return toast.error(result.error)
    toast.success(draft.seriesSize > 1 ? 'Série publicada!' : 'Evento publicado!')
    router.push(`/eventos/${draft.slug ?? draft.id}`)
  }

  async function remove(draft: DraftEvent) {
    const message = draft.seriesSize > 1 ? `Excluir os ${draft.seriesSize} eventos da série?` : 'Excluir este rascunho?'
    if (!window.confirm(message)) return
    setBusy(draft.id)
    const result = await deleteDraftEventAction(draft.id)
    setBusy(null)
    if ('error' in result) return toast.error(result.error)
    toast.success('Rascunho excluído.')
    router.refresh()
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <FilePen className="size-4 text-yellow-400" />
        <h2 className="font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>Rascunhos</h2>
        <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 rounded-full px-2 py-0.5">{drafts.length}</span>
      </div>
      <p className="text-xs text-white/40 -mt-1">Só você vê. Publique quando estiver pronto.</p>
      {drafts.map((draft) => (
        <div key={draft.id} className="card-dark rounded-2xl p-4 space-y-3 border border-dashed border-yellow-400/25">
          <div className="space-y-1">
            <p className="font-semibold text-white truncate">{draft.title}</p>
            <p className="text-xs text-white/50">
              {new Date(draft.starts_at).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })} · {draft.city}
            </p>
            {draft.seriesSize > 1 && (
              <p className="flex items-center gap-1.5 text-xs text-primary">
                <Repeat className="size-3.5" />
                Série de {draft.seriesSize} eventos, {repeatLabel(draft.rule)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/eventos/${draft.slug ?? draft.id}/editar`}
              className="flex-1 text-center text-sm font-semibold rounded-full border border-white/10 bg-white/5 py-2 text-white hover:border-primary/30 transition-colors">
              Continuar editando
            </Link>
            <button
              type="button"
              disabled={busy === draft.id}
              onClick={() => publish(draft)}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold rounded-full bg-primary py-2 text-background disabled:opacity-60">
              {busy === draft.id && <Loader2 className="size-4 animate-spin" />}
              {draft.seriesSize > 1 ? 'Publicar série' : 'Publicar'}
            </button>
            <button
              type="button"
              aria-label="Excluir rascunho"
              disabled={busy === draft.id}
              onClick={() => remove(draft)}
              className="p-2 text-red-400/80 hover:text-red-400 disabled:opacity-60">
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}
