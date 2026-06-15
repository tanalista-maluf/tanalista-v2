'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Clock, Copy, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { toast } from 'sonner'

interface PixData {
  qr_code: string
  qr_code_base64: string
  expires_at: string
}

interface PagamentoPixViewProps {
  participationId: string
  eventId: string
  method: string
}

const POLL_INTERVAL = 3000
const MAX_POLLS     = 100 // ~5 min

export function PagamentoPixView({ participationId, eventId, method }: PagamentoPixViewProps) {
  const router = useRouter()
  const [pixData, setPixData] = useState<PixData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [polls, setPolls]       = useState(0)
  const [expired, setExpired]   = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [copied, setCopied]     = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  // Gerar PIX ao montar
  useEffect(() => {
    if (method !== 'PIX') { setLoading(false); return }

    fetch('/api/pagamentos/pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participation_id: participationId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setApiError(data.error); return }
        setPixData(data)
      })
      .catch(() => setApiError('Erro ao gerar PIX. Tente novamente.'))
      .finally(() => setLoading(false))
  }, [participationId, method])

  // Polling de confirmação
  useEffect(() => {
    if (!pixData || confirmed || expired) return

    const supabase = createClient()
    let count = 0

    const interval = setInterval(async () => {
      count++
      setPolls(count)

      if (count >= MAX_POLLS) {
        clearInterval(interval)
        setExpired(true)
        return
      }

      const { data } = await supabase
        .from('participations')
        .select('status')
        .eq('id', participationId)
        .single()

      if (data?.status === 'CONFIRMED') {
        clearInterval(interval)
        setConfirmed(true)
        setTimeout(() => router.push(`/eventos/${eventId}?joined=1`), 1500)
      }
    }, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [pixData, confirmed, expired, participationId, eventId, router])

  async function copyCode() {
    if (!pixData?.qr_code) return
    await navigator.clipboard.writeText(pixData.qr_code)
    setCopied(true)
    toast.success('Código PIX copiado!')
    setTimeout(() => setCopied(false), 3000)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-white/50">Gerando PIX...</p>
      </div>
    )
  }

  if (apiError) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-destructive">{apiError}</p>
        <Link href={`/eventos/${eventId}`} className={cn(buttonVariants({ variant: 'outline' }))}>
          Voltar ao evento
        </Link>
      </div>
    )
  }

  if (confirmed) {
    return (
      <div className="text-center space-y-3 py-8">
        <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CheckCheck className="size-8 text-primary" />
        </div>
        <p className="font-semibold text-primary">Pagamento confirmado!</p>
        <p className="text-sm text-white/50">Redirecionando...</p>
      </div>
    )
  }

  if (expired) {
    return (
      <div className="text-center space-y-4 py-8">
        <Clock className="size-12 mx-auto text-destructive" />
        <p className="font-semibold">Tempo expirado</p>
        <p className="text-sm text-white/50">
          O código PIX expirou. Sua inscrição foi cancelada automaticamente.
        </p>
        <Link href={`/eventos/${eventId}`} className={cn(buttonVariants({ variant: 'outline' }))}>
          Voltar ao evento
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* QR Code */}
      {pixData?.qr_code_base64 ? (
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
      ) : (
        <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 aspect-square max-w-[200px] mx-auto flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary/40" />
        </div>
      )}

      {/* Copia e cola */}
      {pixData?.qr_code && (
        <div className="space-y-2">
          <p className="text-xs text-center text-white/50">Ou copie o código:</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={pixData.qr_code}
              className="flex-1 rounded-lg border bg-white/[0.04] px-3 py-2 text-xs text-white/50 truncate"
            />
            <Button size="icon" variant="outline" onClick={copyCode} className="shrink-0">
              {copied ? <CheckCheck className="size-4 text-primary" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Instruções */}
      <ol className="space-y-2 text-sm text-white/50 list-decimal list-inside">
        <li>Abra o app do seu banco</li>
        <li>Acesse a área PIX → Ler QR Code</li>
        <li>Aponte para o código acima</li>
        <li>Confirme o pagamento</li>
      </ol>

      {/* Timer */}
      <div className="flex items-center justify-center gap-2 text-xs text-white/50">
        <Loader2 className="size-3.5 animate-spin" />
        <span>Aguardando confirmação... (verificação {polls}/{MAX_POLLS})</span>
      </div>

      <Button variant="outline" className="w-full" onClick={() => router.push(`/eventos/${eventId}`)}>
        Pagar depois
      </Button>
    </div>
  )
}
