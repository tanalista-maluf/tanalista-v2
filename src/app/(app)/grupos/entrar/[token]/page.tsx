'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { joinGroupByInviteAction } from '@/features/grupos/actions'
import { Loader2, CheckCircle2, XCircle, Users } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function GroupInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [state, setState] = useState<'loading' | 'success' | 'already' | 'error'>('loading')
  const [groupRef, setGroupRef] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')

  useEffect(() => {
    joinGroupByInviteAction(token).then((res) => {
      if (res.error) {
        setErrorMsg(res.error)
        setState('error')
        return
      }
      setGroupRef((res as any).groupSlug ?? (res as any).groupId ?? null)
      setState(res.alreadyMember ? 'already' : 'success')
    })
  }, [token])

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="max-w-sm w-full card-dark rounded-2xl p-8 text-center space-y-5">
        {state === 'loading' && (
          <>
            <Loader2 className="size-10 mx-auto text-primary animate-spin" />
            <p className="text-white/60 text-sm">Verificando convite...</p>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">Bem-vindo ao grupo!</p>
              <p className="text-sm text-white/50 mt-1">Você entrou com sucesso.</p>
            </div>
            <Link href={`/grupos/${groupRef}`} className={cn(buttonVariants(), 'w-full gap-2')}>
              <Users className="size-4" />
              Ver grupo
            </Link>
          </>
        )}

        {state === 'already' && (
          <>
            <div className="size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
              <Users className="size-8 text-white/40" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">Você já é membro</p>
              <p className="text-sm text-white/50 mt-1">Já faz parte deste grupo.</p>
            </div>
            <Link href={`/grupos/${groupRef}`} className={cn(buttonVariants({ variant: 'outline' }), 'w-full border-white/10')}>
              Ver grupo
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="size-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <XCircle className="size-8 text-red-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">Convite inválido</p>
              <p className="text-sm text-white/50 mt-1">{errorMsg}</p>
            </div>
            <Link href="/grupos" className={cn(buttonVariants({ variant: 'outline' }), 'w-full border-white/10')}>
              Ver grupos
            </Link>
          </>
        )}
      </div>
    </main>
  )
}
