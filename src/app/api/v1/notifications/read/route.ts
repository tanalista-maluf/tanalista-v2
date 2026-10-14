import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'

const bodySchema = z.object({ id: z.string().uuid().optional() })

// Marca como lida uma notificação (id) ou todas, pelo app mobile. Grava com o
// cliente da pessoa: a RLS só deixa mexer nas próprias notificações.
export async function POST(request: Request) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })

  let query = session.supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', session.user.id)
    .eq('read', false)
  if (parsed.data.id) query = query.eq('id', parsed.data.id)

  const { error } = await query
  if (error) return NextResponse.json({ error: 'Erro ao atualizar notificações.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
