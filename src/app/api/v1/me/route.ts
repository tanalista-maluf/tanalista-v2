import { NextResponse } from 'next/server'
import { getBearerSession } from '@/lib/supabase/bearer'
import { deleteAccount } from '@/features/auth/delete-account'

// Exclusão da própria conta, pelo app mobile.
export async function DELETE(request: Request) {
  const session = await getBearerSession(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const result = await deleteAccount(session.user.id)

  if ('error' in result) return NextResponse.json(result, { status: result.blockers ? 409 : 500 })
  return NextResponse.json(result)
}
