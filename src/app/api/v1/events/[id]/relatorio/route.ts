import { createElement, type ReactElement } from 'react'
import { NextResponse } from 'next/server'
import { pdf, type DocumentProps } from '@react-pdf/renderer'
import type { User } from '@supabase/supabase-js'
import { verifyReportToken } from '@/lib/report-token'
import { createAdminClient } from '@/lib/supabase/admin'
import { runWithSupabaseClient } from '@/lib/supabase/request-context'
import { getEventFinancialDetail } from '@/features/financeiro/queries'
import { EventReportDocument } from '@/features/financeiro/pdf/EventReportDocument'

// Aberta pelo navegador do app mobile (não é um fetch: não dá pra mandar o
// Bearer normal), autenticada pelo token de .../v1/actions "eventReportToken"
// em vez de sessão. getEventFinancialDetail já confere que o dono do token é
// o organizador do evento (filtro organizer_id na query).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params
  const token = new URL(request.url).searchParams.get('token') ?? ''
  const verified = verifyReportToken(token, eventId)
  if (!verified) return NextResponse.json({ error: 'Link expirado ou inválido.' }, { status: 401 })

  const admin = createAdminClient()
  admin.auth.getUser = (async () => ({
    data: { user: { id: verified.userId } as User },
    error: null,
  })) as typeof admin.auth.getUser

  const { event, participants } = await runWithSupabaseClient(admin, () => getEventFinancialDetail(eventId))
  if (!event) return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 })

  // createElement devolve o tipo genérico do próprio componente; pdf() espera
  // o elemento <Document> que ele retorna por dentro — mesmo cast implícito
  // que o JSX (<EventReportDocument ... />, tipado como any) já fazia no uso
  // original, no navegador.
  const element = createElement(EventReportDocument, {
    event, participants, generatedAt: new Date(),
  }) as unknown as ReactElement<DocumentProps>

  const stream = await pdf(element).toBuffer()

  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  const buffer = Buffer.concat(chunks)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="relatorio-evento.pdf"`,
    },
  })
}
