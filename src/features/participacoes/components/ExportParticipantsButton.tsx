'use client'

import { Download } from 'lucide-react'

interface Participant {
  profiles: { full_name?: string | null; username?: string | null; city?: string | null } | null
  status: string
  created_at: string
}

export function ExportParticipantsButton({ participants }: { participants: Participant[] }) {
  function handleExport() {
    const header = 'Nome,Username,Cidade,Status,Inscrito em'
    const rows = participants.map(p => {
      const pr = p.profiles
      return [
        pr?.full_name ?? '',
        pr?.username ? `@${pr.username}` : '',
        pr?.city ?? '',
        p.status === 'CONFIRMED' ? 'Confirmado' : 'Aguardando pagamento',
        new Date(p.created_at).toLocaleString('pt-BR'),
      ].map(v => `"${v}"`).join(',')
    })

    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `participantes_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

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
