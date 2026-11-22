import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { confirmEventPhotoUpload, createEventPhotoUpload } from '@/features/galeria/photos'

// Fotos de evento pelo app, em dois passos: { mimeType, size } devolve o link
// de envio assinado (a foto vai direto ao Storage, sem passar pela Vercel);
// depois { path } registra a foto enviada. Mesma regra do site: organizador e
// inscritos confirmados, até 250MB por evento.
const bodySchema = z.union([
  z.object({ mimeType: z.string().max(50), size: z.number().int().positive() }),
  z.object({ path: z.string().min(1).max(300) }),
])

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: eventId } = await params
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!z.string().uuid().safeParse(eventId).success || !parsed.success) {
    return NextResponse.json({ error: 'Foto inválida. Use JPG, PNG ou WebP.' }, { status: 400 })
  }

  const result =
    'path' in parsed.data
      ? await confirmEventPhotoUpload(session.supabase, session.user.id, eventId, parsed.data.path)
      : await createEventPhotoUpload(session.supabase, session.user.id, eventId, parsed.data)
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}
