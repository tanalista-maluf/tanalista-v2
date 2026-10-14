'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Copy, CheckCheck, RefreshCw, QrCode, CreditCard, TriangleAlert, Clock } from 'lucide-react'
import { CardPaymentForm, type CardFormData } from '@/features/participacoes/components/CardPaymentForm'
import Image from 'next/image'
import Link from 'next/link'

const PRESET_AMOUNTS = [10, 25, 50, 100, 200]

interface PendingPix {
  qr_code: string
  qr_code_base64: string
  amount: number
  expires_at: string
}

interface Props {
  pendingPix?: PendingPix | null
  // Formulário de cartão (chave pública do Mercado Pago ou, fora de produção, cobrança de teste)
  card: { publicKey: string | null; stub: boolean }
  email?: string
}

// Mesma taxa do servidor (src/features/carteira/wallet.ts): sai do valor creditado
const CARD_FEE = { single: 0.03, installments: 0.05 }

function brl(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function credited(cents: number, installments: number) {
  return cents - Math.round(cents * (installments > 1 ? CARD_FEE.installments : CARD_FEE.single))
}

function PixView({ pixData, onNew }: { pixData: { qr_code: string; qr_code_base64: string; amount?: number; expires_at?: string }; onNew: () => void }) {
  const [copied, setCopied] = useState(false)

  async function copyCode() {
    await navigator.clipboard.writeText(pixData.qr_code)
    setCopied(true)
    toast.success('Código PIX copiado!')
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="space-y-5">
      {pixData.amount && (
        <div className="text-center">
          <p className="text-xs text-white/40">Valor</p>
          <p className="text-2xl font-bold text-primary">
            {(pixData.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          {pixData.expires_at && (
            <p className="text-xs text-white/30 mt-0.5">
              Expira às {new Date(pixData.expires_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}

      <p className="text-sm text-center text-white/50">
        Escaneie o QR Code ou copie o código abaixo para concluir a recarga.
      </p>

      {pixData.qr_code_base64 && (
        <div className="flex justify-center">
          <div className="rounded-xl border-2 border-primary/20 p-3 bg-white">
            <Image
              src={`data:image/png;base64,${pixData.qr_code_base64}`}
              alt="QR Code PIX"
              width={200}
              height={200}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <input
          readOnly
          value={pixData.qr_code}
          className="flex-1 rounded-lg border bg-white/[0.04] px-3 py-2 text-xs text-white/50 truncate"
        />
        <Button size="icon" variant="outline" onClick={copyCode}>
          {copied ? <CheckCheck className="size-4 text-primary" /> : <Copy className="size-4" />}
        </Button>
      </div>

      <ol className="space-y-1.5 text-sm text-white/50 list-decimal list-inside">
        <li>Abra o app do seu banco</li>
        <li>Acesse a área PIX → Ler QR Code</li>
        <li>Confirme o pagamento</li>
        <li>O saldo será creditado automaticamente</li>
      </ol>

      <Button variant="outline" className="w-full" onClick={onNew}>
        <RefreshCw className="size-4 mr-2" />
        Nova recarga
      </Button>
    </div>
  )
}

export function DepositForm({ pendingPix, card, email }: Props) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'PIX' | 'CARD'>('PIX')
  // Recarga com cartão: valor escolhido e, depois de pagar, o resultado
  const [cardAmount, setCardAmount] = useState<number | null>(null)
  const [cardResult, setCardResult] = useState<{ status: 'approved' | 'in_process'; credited: number } | null>(null)
  const cardEnabled = !!card.publicKey || card.stub

  async function payWithCard(data: CardFormData) {
    if (!cardAmount) return
    const res = await fetch('/api/pagamentos/deposito/cartao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount_cents: cardAmount, card: data }),
    })
    const result = await res.json()
    if (result.error) toast.error(result.error)
    else setCardResult(result)
  }
  const [loading, setLoading] = useState(false)
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string; amount?: number; expires_at?: string } | null>(null)
  const [showPending, setShowPending] = useState(true)

  async function handleSubmit() {
    const value = parseFloat(amount.replace(',', '.'))
    if (isNaN(value) || value < 10) {
      toast.error('Valor mínimo para recarga: R$ 10,00')
      return
    }
    if (value > 5000) {
      toast.error('Valor máximo por recarga: R$ 5.000,00')
      return
    }

    if (method === 'CARD') {
      setCardAmount(Math.round(value * 100))
      return
    }

    setLoading(true)
    const res = await fetch('/api/pagamentos/deposito', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount_cents: Math.round(value * 100) }),
    })
    const data = await res.json()
    setLoading(false)

    if (data.error) {
      toast.error(data.error)
    } else {
      setPixData(data)
    }
  }

  // Mostrar PIX pendente do servidor
  if (pendingPix && showPending && !pixData) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-yellow-400/8 border border-yellow-400/20 px-4 py-3 text-center">
          <p className="text-xs font-semibold text-yellow-300">PIX pendente encontrado</p>
          <p className="text-xs text-white/40 mt-0.5">Você tem um PIX não pago. Conclua ou gere uma nova recarga.</p>
        </div>
        <PixView pixData={pendingPix} onNew={() => setShowPending(false)} />
      </div>
    )
  }

  if (cardResult) {
    return (
      <div className="space-y-4 text-center py-6">
        {cardResult.status === 'approved' ? (
          <CheckCheck className="size-10 mx-auto text-primary" />
        ) : (
          <Clock className="size-10 mx-auto text-yellow-400" />
        )}
        <p className="text-white font-medium">
          {cardResult.status === 'approved'
            ? `Recarga confirmada! ${brl(cardResult.credited)} já estão na sua carteira.`
            : `Pagamento em análise. ${brl(cardResult.credited)} entram na carteira assim que o Mercado Pago aprovar.`}
        </p>
        <Link href="/carteira" className="inline-block text-sm text-primary hover:underline">Voltar à carteira</Link>
      </div>
    )
  }

  if (cardAmount) {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <p className="text-2xl font-bold text-primary">{brl(cardAmount)}</p>
          <p className="text-xs text-yellow-400">
            Entram {brl(credited(cardAmount, 1))} à vista (taxa de 3%) ou {brl(credited(cardAmount, 2))} parcelado (taxa de 5%)
          </p>
        </div>
        <CardPaymentForm
          publicKey={card.publicKey}
          stub={card.stub}
          amountCents={cardAmount}
          email={email}
          maxInstallments={12}
          onSubmit={payWithCard}
        />
        <Button variant="outline" className="w-full" onClick={() => setCardAmount(null)}>
          Voltar
        </Button>
      </div>
    )
  }

  // Mostrar PIX recém-gerado
  if (pixData) {
    return <PixView pixData={pixData} onNew={() => setPixData(null)} />
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label>Valor da recarga (R$)</Label>
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Ex: 50,00"
          type="text"
          inputMode="decimal"
        />
      </div>

      <div className="grid grid-cols-5 gap-2">
        {PRESET_AMOUNTS.map((v) => (
          <Button
            key={v}
            variant={amount === String(v) ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAmount(String(v))}
          >
            {v}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        <Label>Forma de pagamento</Label>
        {[
          { id: 'PIX' as const, label: 'PIX', desc: 'Sem taxa: o valor entra inteiro', icon: QrCode },
          ...(cardEnabled
            ? [{ id: 'CARD' as const, label: 'Cartão de crédito', desc: 'À vista ou parcelado', icon: CreditCard }]
            : []),
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setMethod(option.id)}
            className={[
              'w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
              method === option.id ? 'border-primary bg-primary/5' : 'border-white/10 hover:border-primary/30',
            ].join(' ')}>
            <option.icon className="size-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">{option.label}</p>
              <p className="text-xs text-white/50">{option.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {method === 'CARD' && (
        <div className="flex gap-2 rounded-lg border border-yellow-400/25 bg-yellow-400/5 p-3">
          <TriangleAlert className="size-4 text-yellow-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-yellow-400">Taxa do cartão: 3% à vista e 5% parcelado</p>
            <p className="text-white/60 mt-0.5">
              A taxa é descontada do valor creditado.
              {(() => {
                const cents = Math.round(parseFloat(amount.replace(',', '.')) * 100)
                return cents >= 1000 && cents <= 500000
                  ? ` Recarregando ${brl(cents)}, entram ${brl(credited(cents, 1))} à vista ou ${brl(credited(cents, 2))} parcelado.`
                  : ''
              })()}
            </p>
          </div>
        </div>
      )}

      <Button className="w-full" onClick={handleSubmit} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin mr-2" />
            Gerando PIX...
          </>
        ) : method === 'CARD' ? (
          'Continuar para o cartão'
        ) : (
          'Gerar PIX de recarga'
        )}
      </Button>

      <p className="text-xs text-center text-white/50">
        Mínimo R$ 10,00 · Máximo R$ 5.000,00 por recarga
      </p>
    </div>
  )
}
