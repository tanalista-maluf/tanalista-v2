import { NextResponse } from 'next/server'
import { getNotifications } from '@/features/notificacoes/queries'

export async function GET() {
  const data = await getNotifications(20)
  return NextResponse.json(data)
}
