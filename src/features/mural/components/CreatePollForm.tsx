'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createPollAction } from '../actions-polls'
import { Plus, Trash2, BarChart2, X } from 'lucide-react'

interface Props {
  eventId: string
  onCreated: () => void
}

export function CreatePollForm({ eventId, onCreated }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function addOption() {
    if (options.length < 5) setOptions(prev => [...prev, ''])
  }

  function removeOption(i: number) {
    if (options.length <= 2) return
    setOptions(prev => prev.filter((_, idx) => idx !== i))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const filled = options.filter(o => o.trim())
    if (!question.trim() || filled.length < 2) {
      setError('Preencha a pergunta e pelo menos 2 opções')
      return
    }
    startTransition(async () => {
      const res = await createPollAction(eventId, question, filled)
      if (res.error) { setError(res.error); return }
      setQuestion(''); setOptions(['', '']); setOpen(false)
      onCreated()
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs text-white/40 hover:text-primary transition-colors border border-white/10 rounded-xl px-3 py-2 hover:border-primary/30 w-full justify-center"
      >
        <BarChart2 className="size-3.5" />
        Criar enquete
      </button>
    )
  }

  return (
    <div className="card-dark rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <BarChart2 className="size-4 text-primary" />
          Nova enquete
        </p>
        <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white">
          <X className="size-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Qual é a pergunta?"
          maxLength={300}
          className="w-full rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 px-3 py-2.5 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        />

        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={opt}
                onChange={e => setOptions(prev => prev.map((o, idx) => idx === i ? e.target.value : o))}
                placeholder={`Opção ${i + 1}`}
                maxLength={100}
                className="flex-1 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 px-3 py-2 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
              {options.length > 2 && (
                <button type="button" onClick={() => removeOption(i)} className="text-white/25 hover:text-red-400 transition-colors">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {options.length < 5 && (
          <button type="button" onClick={addOption} className="text-xs text-white/40 hover:text-primary flex items-center gap-1 transition-colors">
            <Plus className="size-3.5" /> Adicionar opção
          </button>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex-1 py-2 rounded-xl text-sm text-white/50 border border-white/10 hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 py-2 rounded-xl text-sm font-semibold bg-primary text-background hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Criando...' : 'Publicar'}
          </button>
        </div>
      </form>
    </div>
  )
}
