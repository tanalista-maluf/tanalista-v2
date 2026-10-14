import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBearerSession } from '@/lib/supabase/bearer'
import { createAdminClient } from '@/lib/supabase/admin'

const bodySchema = z.object({ full_name: z.string().trim().min(2).max(100) })

// Nome vindo do "Entrar com Apple" no iPhone: a Apple só manda o nome na
// primeira vez, e ele não vem no token, então o app grava aqui. Só preenche
// perfil ainda sem nome (o padrão do cadastro é "Usuário").
export async function POST(request: Request) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Nome inválido.' }, { status: 400 })

  const { error } = await createAdminClient()
    .from('profiles')
    .update({ full_name: parsed.data.full_name })
    .eq('id', session.user.id)
    .in('full_name', ['Usuário', ''])

  if (error) return NextResponse.json({ error: 'Erro ao salvar o nome.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
