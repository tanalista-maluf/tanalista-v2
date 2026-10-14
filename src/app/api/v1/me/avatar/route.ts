import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { uploadAvatar } from '@/features/perfil/profile'

// base64 de 2MB ocupa cerca de 2,7MB; acima disso a regra de tamanho já recusa
const bodySchema = z.object({
  image: z.string().min(1).max(4_000_000),
  mimeType: z.string().max(50),
})

// Foto de perfil enviada pelo app mobile, em JSON com a imagem em base64: o
// fetch do React Native não envia arquivo em multipart de forma confiável.
// A validação e a gravação são as mesmas da server action do site.
export async function POST(request: Request) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Nenhum arquivo selecionado.' }, { status: 400 })

  const file = new File([Buffer.from(parsed.data.image, 'base64')], 'avatar', { type: parsed.data.mimeType })

  const result = await uploadAvatar(session.supabase, session.user.id, file)
  return NextResponse.json(result, { status: 'error' in result ? 400 : 200 })
}
