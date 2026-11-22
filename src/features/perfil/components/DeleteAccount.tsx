'use client'

import { useState, useTransition } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { deleteAccountAction } from '@/features/auth/actions'

// Exclusão da conta: apaga os dados pessoais e encerra o acesso. Com saldo,
// eventos ou grupos pendentes, o servidor recusa e diz o que resolver antes.
export function DeleteAccount() {
  const [pending, startTransition] = useTransition()
  const [problem, setProblem] = useState<{ message: string; blockers: string[] } | null>(null)

  function handleDelete() {
    if (!window.confirm('Excluir sua conta? Seus dados pessoais são apagados e você perde o acesso. Não dá para desfazer.')) return
    setProblem(null)
    startTransition(async () => {
      const result = await deleteAccountAction()
      // Sem erro, a ação redireciona para o login
      if (result && 'error' in result) {
        setProblem({ message: result.error, blockers: ('blockers' in result && result.blockers) || [] })
      }
    })
  }

  return (
    <div className="space-y-2 pt-2">
      <p className="text-xs text-white/35 uppercase tracking-widest px-1">Excluir conta</p>
      <div className="card-dark rounded-2xl p-4 space-y-3">
        <p className="text-xs text-white/50 leading-relaxed">
          Apaga seus dados pessoais e encerra seu acesso de forma definitiva. O histórico de eventos e pagamentos
          continua existindo, sem o seu nome.
        </p>
        {problem && (
          <div className="rounded-xl border border-yellow-400/25 bg-yellow-400/5 p-3 space-y-1">
            <p className="text-xs font-semibold text-yellow-400">{problem.message}</p>
            {problem.blockers.map((blocker) => (
              <p key={blocker} className="text-xs text-white/60">• {blocker}</p>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-red-400 border border-red-400/20 hover:bg-red-400/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          Excluir minha conta
        </button>
      </div>
    </div>
  )
}
