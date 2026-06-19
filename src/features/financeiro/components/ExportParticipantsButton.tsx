'use client'

import { Download } from 'lucide-react'
import type { EventParticipant } from '@/features/financeiro/queries'

function fmt(cents: number | null) {
  if (cents === null) return ''
  return (cents / 100).toFixed(2).replace('.', ',')
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

const METHOD_LABELS: Record<string, string> = {
  PIX: 'PIX',
  CARD: 'Cartão',
  WALLET: 'Carteira',
  FREE: 'Gratuito',
}

export function ExportParticipantsButton({
  participants,
  eventTitle,
}: {
  participants: EventParticipant[]
  eventTitle: string
}) {
  function handleExport() {
    const BOM = '﻿'
    const header = ['Nome', 'Usuário', 'Data inscrição', 'Forma de pagamento', 'Valor pago (R$)']
    const rows = participants.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.email.replace(/"/g, '""')}"`,
      fmtDate(p.joined_at),
      METHOD_LABELS[p.payment_method ?? 'FREE'] ?? p.payment_method ?? 'Gratuito',
      fmt(p.payment_amount),
    ])
    const csv = BOM + [header, ...rows].map(r => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeName = eventTitle.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)
    a.download = `participantes_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (participants.length === 0) return null

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 text-xs text-white/40 hover:text-primary transition-colors"
    >
      <Download className="size-3.5" />
      Exportar lista
    </button>
  )
}
