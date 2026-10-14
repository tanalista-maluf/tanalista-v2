import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { isPhotoUploadEnabled, saveEventPhoto, uploadToCloudinary } from '@/features/galeria/photos'

// Uma foto comprimida pelo app fica bem abaixo disto; o corpo de uma função na Vercel vai até 4,5MB
const bodySchema = z.object({
  image: z.string().min(1).max(4_000_000),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
})

// Foto de evento enviada pelo app mobile, em JSON com a imagem em base64. O
// servidor a envia ao Cloudinary e registra com a mesma regra do site
// (organizador e inscritos confirmados, limite de espaço por evento).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  if (!isPhotoUploadEnabled()) {
    return NextResponse.json({ error: 'O envio de fotos não está disponível no momento.' }, { status: 503 })
  }

  const { id: eventId } = await params
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!z.string().uuid().safeParse(eventId).success || !parsed.success) {
    return NextResponse.json({ error: 'Foto inválida. Use JPG, PNG ou WebP.' }, { status: 400 })
  }

  const file = new File([Buffer.from(parsed.data.image, 'base64')], 'foto', { type: parsed.data.mimeType })
  const uploaded = await uploadToCloudinary(file, eventId)
  if (!uploaded) return NextResponse.json({ error: 'Erro ao enviar a foto.' }, { status: 502 })

  const result = await saveEventPhoto(session.supabase, session.user.id, eventId, uploaded)
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}
