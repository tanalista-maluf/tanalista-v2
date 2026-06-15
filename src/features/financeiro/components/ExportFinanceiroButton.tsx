'use client'

import { Download } from 'lucide-react'
import type { EventFinancial } from '@/features/financeiro/queries'

function fmt(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',')
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function ExportFinanceiroButton({ events }: { events: EventFinancial[] }) {
  function handleExport() {
    const BOM = '﻿'
    const header = ['Evento', 'Data', 'Status', 'Inscritos', 'Capacidade', 'Bruto (R$)', 'Taxas (R$)', 'Líquido (R$)']
    const rows = events.map(e => [
      `"${e.title.replace(/"/g, '""')}"`,
      fmtDate(e.starts_at),
      e.status,
      e.confirmed_count,
      e.capacity,
      fmt(e.gross_revenue),
      fmt(e.platform_fees + e.gateway_fees),
      fmt(e.net_revenue),
    ])
    const csv = BOM + [header, ...rows].map(r => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financeiro_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (events.length === 0) return null

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 text-xs text-white/40 hover:text-primary transition-colors"
    >
      <Download className="size-3.5" />
      Exportar CSV
    </button>
  )
}
