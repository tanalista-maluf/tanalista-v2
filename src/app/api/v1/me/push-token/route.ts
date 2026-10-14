import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { registerPushToken, unregisterPushToken } from '@/lib/mobile-push'

// Token de push do aparelho: o app registra ao entrar (e a cada abertura) e
// remove ao sair da conta
const bodySchema = z.object({
  token: z.string().regex(/^Expo(nent)?PushToken\[.+\]$/, 'Token inválido.').max(200),
  platform: z.enum(['ios', 'android']).optional(),
})

export async function POST(request: Request) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success || !parsed.data.platform) return NextResponse.json({ error: 'Token inválido.' }, { status: 400 })

  const result = await registerPushToken(session.user.id, parsed.data.token, parsed.data.platform)
  return NextResponse.json(result, { status: 'error' in result ? 500 : 200 })
}

export async function DELETE(request: Request) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Token inválido.' }, { status: 400 })

  return NextResponse.json(await unregisterPushToken(session.user.id, parsed.data.token))
}
