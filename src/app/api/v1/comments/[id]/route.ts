import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { deleteComment } from '@/features/eventos/engagement'

// Apaga uma mensagem do mural, pelo app mobile: a própria, ou qualquer uma se for o organizador
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: commentId } = await params
  if (!z.string().uuid().safeParse(commentId).success) {
    return NextResponse.json({ error: 'Mensagem inválida' }, { status: 400 })
  }

  const result = await deleteComment(session.supabase, commentId)
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}
