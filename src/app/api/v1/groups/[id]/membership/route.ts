import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { joinGroup, leaveGroup } from '@/features/grupos/membership'

type Context = { params: Promise<{ id: string }> }

// Entrar em grupo público (POST) e sair de grupo (DELETE) pelo app mobile.
// Mesmas regras das server actions do site.
async function handle(request: Request, { params }: Context, action: typeof joinGroup) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: groupId } = await params
  if (!z.string().uuid().safeParse(groupId).success) {
    return NextResponse.json({ error: 'Grupo inválido.' }, { status: 400 })
  }

  const result = await action(session.supabase, session.user.id, groupId)
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}

export function POST(request: Request, context: Context) {
  return handle(request, context, joinGroup)
}

export function DELETE(request: Request, context: Context) {
  return handle(request, context, leaveGroup)
}
