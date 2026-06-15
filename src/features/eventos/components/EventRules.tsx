import { formatPrice } from '@/utils/format'

interface EventRulesProps {
  event: {
    price: number
    min_participants: number
    capacity: number
    registration_deadline: string
    starts_at: string
    organizer_exempt: boolean
  }
}

export function EventRules({ event }: EventRulesProps) {
  return (
    <div className="card-dark rounded-2xl p-5 space-y-4 text-sm">
      <h3 className="font-semibold text-white">Regras do evento</h3>
      <ul className="space-y-3 text-white/60">
        <li className="flex items-start gap-2">
          <span className="text-primary mt-0.5">•</span>
          <span>Valor da inscrição: <strong className="text-white">{formatPrice(event.price)}</strong></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-primary mt-0.5">•</span>
          <span>Mínimo de participantes para confirmação: <strong className="text-white">{event.min_participants}</strong></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-primary mt-0.5">•</span>
          <span>Capacidade máxima: <strong className="text-white">{event.capacity} pessoas</strong></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-primary mt-0.5">•</span>
          <span>Fila de espera: <strong className="text-white">ilimitada</strong></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-primary mt-0.5">•</span>
          <span>O evento é confirmado automaticamente 12h antes do início, caso o mínimo de participantes seja atingido.</span>
        </li>
        {event.organizer_exempt && (
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>O organizador está isento do pagamento de inscrição.</span>
          </li>
        )}
        <li className="flex items-start gap-2">
          <span className="text-primary mt-0.5">•</span>
          <span>Cancelamentos com menos de 12h de antecedência não têm direito a reembolso integral.</span>
        </li>
      </ul>

      <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-3 text-xs text-yellow-400/80 space-y-1">
        <p className="font-semibold text-yellow-400">Atenção sobre reembolsos</p>
        <p>
          Em caso de cancelamento, o valor devolvido pode ter desconto da taxa de processamento
          do gateway (PIX ~0,99% / Cartão ~2,99%). Você será informado do valor exato antes de confirmar.
        </p>
      </div>
    </div>
  )
}
