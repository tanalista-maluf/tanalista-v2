'use client'

import { Download } from 'lucide-react'

interface Participant {
  name: string
  username: string | null
  checkedIn: boolean
}

interface Props {
  eventTitle: string
  participants: Participant[]
}

// Mesmo CSV do app (manage/[eventId].tsx), baixado em vez de compartilhado
export function ExportCheckInListButton({ eventTitle, participants }: Props) {
  function exportList() {
    const lines = [
      'nome;usuario;check-in',
      ...participants.map((p) => [p.name, p.username ?? '', p.checkedIn ? 'confirmado' : ''].join(';')),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inscritos-${eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={exportList}
      className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors"
    >
      <Download className="size-3.5" />
      Exportar lista
    </button>
  )
}
