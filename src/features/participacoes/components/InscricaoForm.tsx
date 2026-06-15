'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { joinEventAction, joinWaitlistAction } from '../actions'
import { Button } from '@/components/ui/button'
import { Loader2, Wallet, QrCode, CreditCard, ListPlus } from 'lucide-react'
import { formatPrice } from '@/utils/format'
import { toast } from 'sonner'
import { TeamSelector } from '@/features/eventos/components/TeamSelector'

type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'WALLET'

interface Team {
  id: string
  name: string
  capacity: number
  confirmed_count: number
}

interface InscricaoFormProps {
  eventId: string
  eventPrice: number
  walletBalance: number
  isOrganizer: boolean
  organizerExempt: boolean
  wantWaitlist: boolean
  isFull: boolean
  teams?: Team[]
}

const METHODS: { id: PaymentMethod; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'WALLET', label: 'Carteira TáNaLista', icon: Wallet, desc: 'Desconto imediato do saldo' },
  { id: 'PIX', label: 'PIX', icon: QrCode, desc: 'Gera QR Code · prazo 30 min' },
  { id: 'CREDIT_CARD', label: 'Cartão de crédito', icon: CreditCard, desc: 'Cobrança imediata' },
]

export function InscricaoForm({
  eventId, eventPrice, walletBalance, isOrganizer, organizerExempt, wantWaitlist, isFull, teams,
}: InscricaoFormProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<PaymentMethod>('PIX')
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(teams?.[0]?.id ?? null)
  const [loading, setLoading] = useState(false)

  const isExempt = isOrganizer && organizerExempt
  const isFree = eventPrice === 0
  const hasTeams = teams && teams.length > 0

  // Fila de espera
  if (wantWaitlist || (isFull && !isExempt)) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-white/[0.04] border p-4 text-sm text-white/50 space-y-2">
          <p className="font-medium text-foreground">Sobre a fila de espera</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Você será notificado se uma vaga abrir</li>
            <li>Ao ser notificado, terá <strong>3 horas</strong> para confirmar o pagamento</li>
            <li>Se não pagar no prazo, a vaga passa para o próximo</li>
          </ul>
        </div>

        {hasTeams && (
          <TeamSelector
            teams={teams}
            selectedTeamId={selectedTeamId}
            onSelect={setSelectedTeamId}
            disabled={loading}
          />
        )}

        {hasTeams && !selectedTeamId && (
          <p className="text-xs text-yellow-400">Escolha um time para entrar na fila.</p>
        )}

        <Button
          className="w-full"
          disabled={loading || (hasTeams && !selectedTeamId)}
          onClick={async () => {
            setLoading(true)
            const result = await joinWaitlistAction(eventId, selectedTeamId ?? undefined)
            setLoading(false)
            if (result?.error) toast.error(result.error)
            else {
              toast.success(`Você está na fila! Posição: #${result.position}`)
              router.push(`/eventos/${eventId}`)
            }
          }}
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          <ListPlus className="size-4" />
          Entrar na fila de espera
        </Button>
      </div>
    )
  }

  // Isento ou gratuito
  if (isExempt || isFree) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-sm">
          {isExempt
            ? 'Como organizador, você está isento do pagamento de inscrição.'
            : 'Este evento é gratuito.'}
        </div>

        {hasTeams && (
          <TeamSelector
            teams={teams}
            selectedTeamId={selectedTeamId}
            onSelect={setSelectedTeamId}
            disabled={loading}
          />
        )}

        <Button
          className="w-full"
          disabled={loading || (hasTeams && !selectedTeamId)}
          onClick={async () => {
            setLoading(true)
            const result = await joinEventAction(eventId, 'WALLET', selectedTeamId ?? undefined)
            setLoading(false)
            if (result?.error) toast.error(result.error)
          }}
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          Confirmar inscrição
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {hasTeams && (
        <TeamSelector
          teams={teams}
          selectedTeamId={selectedTeamId}
          onSelect={setSelectedTeamId}
          disabled={loading}
        />
      )}

      {/* Seleção de método */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Forma de pagamento</p>
        {METHODS.map((m) => {
          const insufficient = m.id === 'WALLET' && walletBalance < eventPrice
          return (
            <button
              key={m.id}
              type="button"
              disabled={insufficient}
              onClick={() => setSelected(m.id)}
              className={[
                'w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                selected === m.id
                  ? 'border-primary bg-primary/5'
                  : 'border-white/10 hover:border-primary/30',
                insufficient ? 'opacity-50 cursor-not-allowed' : '',
              ].join(' ')}
            >
              <m.icon className="size-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-xs text-white/50">
                  {m.id === 'WALLET'
                    ? `Saldo: ${formatPrice(walletBalance)}${insufficient ? ' — insuficiente' : ''}`
                    : m.desc}
                </p>
              </div>
              {selected === m.id && (
                <span className="size-4 rounded-full bg-primary shrink-0" />
              )}
            </button>
          )
        })}
      </div>

      {/* Aviso PIX */}
      {selected === 'PIX' && (
        <div className="rounded-lg bg-yellow-400/5 border border-yellow-400/20 p-3 text-xs text-yellow-400">
          Após confirmar, você terá <strong>30 minutos</strong> para pagar o PIX.
          Se não pagar no prazo, a inscrição será cancelada automaticamente.
        </div>
      )}

      {/* Resumo */}
      <div className="rounded-lg bg-white/[0.04] p-3 flex items-center justify-between text-sm">
        <span className="text-white/50">Total a pagar</span>
        <span className="font-bold text-primary text-lg">{formatPrice(eventPrice)}</span>
      </div>

      <Button
        className="w-full"
        disabled={loading || (hasTeams && !selectedTeamId)}
        onClick={async () => {
          setLoading(true)
          const result = await joinEventAction(eventId, selected, selectedTeamId ?? undefined)
          setLoading(false)
          if (result?.error) toast.error(result.error)
        }}
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {selected === 'PIX' ? 'Gerar PIX' : selected === 'CREDIT_CARD' ? 'Pagar com cartão' : 'Pagar com carteira'}
      </Button>
    </div>
  )
}
