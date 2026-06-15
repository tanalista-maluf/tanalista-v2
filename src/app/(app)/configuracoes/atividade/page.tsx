import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserAuditLogs } from '@/features/auditoria/queries'
import { AuditLogList } from '@/features/auditoria/components/AuditLogList'
import { ArrowLeft, Shield } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function AtividadePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const logs = await getUserAuditLogs(50)

  return (
    <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/perfil" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Atividade da conta</h1>
          <p className="text-sm text-white/50">Histórico de ações realizadas</p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
        <Shield className="size-5 text-white/50 shrink-0 mt-0.5" />
        <p className="text-xs text-white/50">
          Por segurança, registramos as ações mais importantes da sua conta. Se identificar atividade suspeita, troque sua senha imediatamente.
        </p>
      </div>

      <AuditLogList logs={logs as any} />
    </main>
  )
}
