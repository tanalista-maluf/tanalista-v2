'use client'

import { useState, useTransition } from 'react'
import { Pencil, Loader2, Check, X } from 'lucide-react'
import { updateEventRulesAction } from '../actions'
import { toast } from 'sonner'

interface Props {
  eventId: string
  initialRules: string | null
}

export function EventRulesEditor({ eventId, initialRules }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialRules ?? '')
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await updateEventRulesAction(eventId, value)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Regras atualizadas.')
        setEditing(false)
      }
    })
  }

  function handleCancel() {
    setValue(initialRules ?? '')
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="space-y-2">
        {value ? (
          <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{value}</p>
        ) : (
          <p className="text-sm text-white/25 italic">Nenhuma regra definida.</p>
        )}
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-primary transition-colors"
        >
          <Pencil className="size-3" />
          {value ? 'Editar regras' : 'Adicionar regras e diretrizes'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={`Ex:\n• Chegue com 15 minutos de antecedência\n• Traje esportivo obrigatório\n• Proibido fumar no local\n• Bebidas alcoólicas não permitidas`}
        rows={6}
        maxLength={2000}
        autoFocus
        className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-primary/40 resize-none transition-colors leading-relaxed"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/25">{value.length}/2000</span>
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-white/50 text-xs hover:text-white transition-colors"
          >
            <X className="size-3" />
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/25 transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
