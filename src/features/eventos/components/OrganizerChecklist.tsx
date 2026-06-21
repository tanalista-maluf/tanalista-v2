import { CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Props {
  event: {
    id: string
    slug?: string | null
    status: string
    description?: string | null
    cover_url?: string | null
    ends_at?: string | null
    cancel_before_hours?: number | null
    confirmed_count: number
    min_participants: number
    capacity: number
    visibility?: string | null
  }
}

interface CheckItem {
  label: string
  done: boolean
  tip?: string
}

export function OrganizerChecklist({ event }: Props) {
  // Só mostrar para eventos OPEN/PENDING que ainda não estão completos
  if (!['OPEN', 'PENDING'].includes(event.status)) return null

  const items: CheckItem[] = [
    {
      label: 'Descrição do evento',
      done: !!event.description && event.description.trim().length > 20,
      tip: 'Uma boa descrição aumenta a taxa de inscrição.',
    },
    {
      label: 'Imagem de capa',
      done: !!event.cover_url,
      tip: 'Eventos com foto recebem 3x mais inscrições.',
    },
    {
      label: 'Horário de término',
      done: !!event.ends_at,
      tip: 'Ajuda os participantes a planejarem o dia.',
    },
    {
      label: 'Política de cancelamento',
      done: event.cancel_before_hours !== null && event.cancel_before_hours !== undefined,
      tip: 'Define se participantes podem cancelar e receber reembolso.',
    },
  ]

  const pending = items.filter(i => !i.done)
  if (pending.length === 0) return null

  const eventSlug = event.slug ?? event.id

  return (
    <div className="rounded-2xl border border-yellow-400/15 bg-yellow-400/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="size-4 text-yellow-400 shrink-0" />
        <p className="text-sm font-semibold text-white">
          {pending.length} item{pending.length !== 1 ? 'ns' : ''} para completar o evento
        </p>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.label} className="flex items-start gap-2.5">
            {item.done
              ? <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
              : <Circle className="size-4 text-white/20 shrink-0 mt-0.5" />
            }
            <div>
              <p className={`text-sm ${item.done ? 'text-white/40 line-through' : 'text-white/80'}`}>
                {item.label}
              </p>
              {!item.done && item.tip && (
                <p className="text-xs text-white/30">{item.tip}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <Link
        href={`/eventos/${eventSlug}/editar`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-yellow-400 hover:text-yellow-300 transition-colors"
      >
        Completar agora →
      </Link>
    </div>
  )
}
