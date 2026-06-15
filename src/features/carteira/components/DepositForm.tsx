'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Copy, CheckCheck } from 'lucide-react'
import Image from 'next/image'

const PRESET_AMOUNTS = [10, 25, 50, 100, 200]

export function DepositForm() {
  const [amount, setAmount]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [pixData, setPixData]   = useState<{ qr_code: string; qr_code_base64: string } | null>(null)
  const [copied, setCopied]     = useState(false)

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

  async function copyCode() {
    if (!pixData?.qr_code) return
    await navigator.clipboard.writeText(pixData.qr_code)
    setCopied(true)
    toast.success('Código PIX copiado!')
    setTimeout(() => setCopied(false), 3000)
  }

  if (pixData) {
    return (
      <div className="space-y-5">
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

        <Button variant="outline" className="w-full" onClick={() => setPixData(null)}>
          Nova recarga
        </Button>
      </div>
    )
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

      <Button className="w-full" onClick={handleSubmit} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin mr-2" />
            Gerando PIX...
          </>
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
