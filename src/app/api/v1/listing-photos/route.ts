import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { checkRateLimit } from '@/lib/rate-limit'
import { createListingPhotoUpload } from '@/features/marketplace/photos'

const bodySchema = z.object({
  mimeType: z.string().max(50),
  size: z.number().int().positive(),
})

// Autoriza o envio de uma foto de anúncio pelo app: devolve o caminho e o
// token do link assinado (o app grava direto no Storage) e o endereço público,
// que o app manda depois junto com o anúncio.
export async function POST(request: Request) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const rl = checkRateLimit(`listing-photo:${session.user.id}`, 30, 10 * 60 * 1000)
  if (!rl.allowed) return NextResponse.json({ error: 'Muitas fotos em pouco tempo. Aguarde.' }, { status: 429 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Foto inválida.' }, { status: 400 })

  const result = await createListingPhotoUpload(session.user.id, parsed.data)
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}
