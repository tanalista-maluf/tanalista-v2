'use client'

import QRCode from 'react-qr-code'
import { QrCode, CheckCircle } from 'lucide-react'

interface Props {
  participationId: string
  eventTitle: string
  checkedInAt: string | null
}

export function ParticipantQRCode({ participationId, eventTitle, checkedInAt }: Props) {
  if (checkedInAt) {
    return (
      <div className="card-dark rounded-2xl p-5 flex flex-col items-center gap-3 text-center">
        <div className="size-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <CheckCircle className="size-7 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-white text-sm">Check-in realizado!</p>
          <p className="text-xs text-white/40 mt-0.5">
            {new Date(checkedInAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
          </p>
        </div>
      </div>
    )
  }

  const qrValue = `tanalista:checkin:${participationId}`

  return (
    <div className="card-dark rounded-2xl p-5 flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        <QrCode className="size-4 text-primary" />
        <p className="text-sm font-semibold text-white">Seu ingresso</p>
      </div>

      <div className="bg-white p-3 rounded-xl">
        <QRCode
          value={qrValue}
          size={180}
          bgColor="#ffffff"
          fgColor="#0D1A14"
          level="M"
        />
      </div>

      <div className="text-center space-y-1">
        <p className="text-xs text-white/50">{eventTitle}</p>
        <p className="text-[10px] text-white/25 font-mono">{participationId.slice(0, 8).toUpperCase()}</p>
      </div>

      <p className="text-[10px] text-white/30 text-center">
        Apresente este QR Code ao organizador na entrada
      </p>
    </div>
  )
}
