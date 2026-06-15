'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { checkInAction } from '../actions-checkin'
import { CheckCircle, XCircle, Camera, Loader2 } from 'lucide-react'
import { UserAvatar } from '@/components/ui/user-avatar'

interface CheckInResult {
  success: boolean
  name?: string
  username?: string
  avatarUrl?: string | null
  alreadyCheckedIn?: boolean
  error?: string
}

interface Props {
  eventId: string
}

type ScanState = 'idle' | 'scanning' | 'processing' | 'success' | 'error'

export function CheckInScanner({ eventId }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [state, setState] = useState<ScanState>('idle')
  const [result, setResult] = useState<CheckInResult | null>(null)
  const processingRef = useRef(false)

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch {}
      scannerRef.current = null
    }
  }, [])

  const startScanner = useCallback(async () => {
    setState('scanning')
    setResult(null)
    processingRef.current = false

    await stopScanner()

    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (processingRef.current) return
          processingRef.current = true
          setState('processing')
          await stopScanner()

          const prefix = 'tanalista:checkin:'
          if (!decodedText.startsWith(prefix)) {
            setResult({ success: false, error: 'QR Code inválido' })
            setState('error')
            return
          }

          const participationId = decodedText.replace(prefix, '')
          const res = await checkInAction(eventId, participationId)
          setResult(res)
          setState(res.success || res.alreadyCheckedIn ? 'success' : 'error')
        },
        () => {}
      )
    } catch {
      setState('error')
      setResult({ success: false, error: 'Não foi possível acessar a câmera' })
    }
  }, [eventId, stopScanner])

  useEffect(() => {
    return () => { stopScanner() }
  }, [stopScanner])

  return (
    <div className="space-y-4">
      {/* Área do scanner */}
      <div className="card-dark rounded-2xl overflow-hidden">
        <div id="qr-reader" className={state === 'scanning' ? 'block' : 'hidden'} />

        {state !== 'scanning' && (
          <div className="h-64 flex flex-col items-center justify-center gap-4 px-6 text-center">
            {state === 'idle' && (
              <>
                <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Camera className="size-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Pronto para escanear</p>
                  <p className="text-xs text-white/40 mt-1">Aponte a câmera para o QR Code do participante</p>
                </div>
              </>
            )}

            {state === 'processing' && (
              <>
                <Loader2 className="size-10 text-primary animate-spin" />
                <p className="text-sm text-white/60">Verificando...</p>
              </>
            )}

            {state === 'success' && result && (
              <>
                <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <CheckCircle className="size-8 text-primary" />
                </div>
                <div className="space-y-2">
                  {result.name && (
                    <div className="flex items-center gap-2 justify-center">
                      <UserAvatar name={result.name} avatarUrl={result.avatarUrl} size="sm" />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-white">{result.name}</p>
                        {result.username && <p className="text-xs text-white/40">@{result.username}</p>}
                      </div>
                    </div>
                  )}
                  <p className={`text-sm font-medium ${result.alreadyCheckedIn ? 'text-yellow-400' : 'text-primary'}`}>
                    {result.alreadyCheckedIn ? 'Já fez check-in anteriormente' : 'Check-in confirmado!'}
                  </p>
                </div>
              </>
            )}

            {state === 'error' && (
              <>
                <div className="size-16 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center justify-center">
                  <XCircle className="size-8 text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-400">Erro</p>
                  <p className="text-xs text-white/40 mt-1">{result?.error ?? 'Tente novamente'}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Botão */}
      {state !== 'scanning' ? (
        <button
          onClick={startScanner}
          className="w-full py-3 rounded-xl text-sm font-semibold bg-primary text-background hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Camera className="size-4" />
          {state === 'idle' ? 'Iniciar scanner' : 'Escanear próximo'}
        </button>
      ) : (
        <button
          onClick={() => { stopScanner(); setState('idle') }}
          className="w-full py-3 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-colors"
        >
          Parar scanner
        </button>
      )}
    </div>
  )
}
