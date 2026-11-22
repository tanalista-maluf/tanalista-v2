'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { EventReportDocument, type EventReportProps } from '../pdf/EventReportDocument'
import type { EventFinancialDetail, EventParticipant } from '../queries'

function slugify(text: string): string {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function downloadEventReportPdf(props: EventReportProps) {
  const blob = await pdf(<EventReportDocument {...props} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relatorio_${slugify(props.event.title)}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export function GeneratePdfReportButton({ event, participants }: { event: EventFinancialDetail; participants: EventParticipant[] }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      await downloadEventReportPdf({ event, participants, generatedAt: new Date() })
    } catch {
      toast.error('Erro ao gerar o PDF. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs text-white/40 hover:text-primary transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
      {loading ? 'Gerando…' : 'Relatório PDF'}
    </button>
  )
}
