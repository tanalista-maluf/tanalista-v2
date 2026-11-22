import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { validateCouponForEvent } from '@/features/cupons/validate-coupon'

const bodySchema = z.object({ code: z.string().min(1).max(30) })

// Consulta o desconto de um cupom para a inscrição no evento, pelo app mobile.
// Não registra o uso: isso acontece na inscrição (POST .../join com couponCode).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: eventId } = await params
  if (!z.string().uuid().safeParse(eventId).success) {
    return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Informe o código.' }, { status: 400 })

  const { data: event } = await session.supabase.from('events').select('price').eq('id', eventId).maybeSingle()
  if (!event) return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 })

  const result = await validateCouponForEvent(session.user.id, parsed.data.code, event.price, eventId)

  if ('error' in result) return NextResponse.json(result, { status: 400 })
  return NextResponse.json({ discount_cents: result.discount_cents })
}
