import { NextResponse } from 'next/server'
import { deliverNotificationPush } from '@/features/notificacoes/push-delivery'

// Chamado pelo banco (pg_net) a cada notificação nova. Não precisa de
// segredo: só recebe o id, e o envio acontece uma vez só, nos primeiros 15
// minutos (ver deliverNotificationPush).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!UUID.test(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })

  await deliverNotificationPush(id)
  return NextResponse.json({ ok: true })
}
