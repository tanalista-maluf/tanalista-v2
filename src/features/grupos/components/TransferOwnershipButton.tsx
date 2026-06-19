'use client'

import { useState, useTransition } from 'react'
import { ShieldCheck, AlertTriangle, Loader2, ChevronDown } from 'lucide-react'
import { UserAvatar } from '@/components/ui/user-avatar'
import { transferGroupOwnershipAction } from '../actions'

interface Member {
  user_id: string
  role: string
  profiles: { full_name: string | null; username: string | null; avatar_url?: string | null } | null
}

export function TransferOwnershipButton({ groupId, members }: { groupId: string; members: Member[] }) {
  const [open, setOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const candidates = members.filter(m => m.role !== 'OWNER')
  const selectedMember = candidates.find(m => m.user_id === selectedUserId)

  function handleTransfer() {
    if (!selectedUserId) return
    startTransition(async () => {
      const result = await transferGroupOwnershipAction(groupId, selectedUserId)
      if (result?.error) setError(result.error)
      // Em caso de sucesso, o redirect/revalidate acontece na action
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
      >
        <ShieldCheck className="size-4" />
        Transferir liderança
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="size-5 text-yellow-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">Transferir liderança do grupo</p>
          <p className="text-xs text-white/50 leading-relaxed">
            Você perderá o status de dono e passará a ser administrador.
            O novo dono terá controle total, incluindo a possibilidade de excluir o grupo.
          </p>
        </div>
      </div>

      {candidates.length === 0 ? (
        <p className="text-xs text-white/40 text-center py-2">
          Não há outros membros para receber a liderança.
        </p>
      ) : (
        <>
          {/* Seleção do novo dono */}
          <div className="space-y-1.5">
            <p className="text-xs text-white/40">Escolha o novo dono:</p>
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={e => { setSelectedUserId(e.target.value); setConfirmed(false); setError(null) }}
                className="w-full appearance-none rounded-xl bg-white/[0.05] border border-white/[0.10] px-3 py-2.5 pr-8 text-sm text-white outline-none focus:border-yellow-500/40 transition-colors"
              >
                <option value="" className="bg-[#0D1A14]">Selecionar membro...</option>
                {candidates.map(m => (
                  <option key={m.user_id} value={m.user_id} className="bg-[#0D1A14]">
                    {m.profiles?.full_name ?? m.profiles?.username ?? 'Usuário'}
                    {m.role === 'ADMIN' ? ' (Admin)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="size-4 text-white/30 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Preview do selecionado */}
          {selectedMember && (
            <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.07] px-3 py-2.5">
              <UserAvatar
                name={selectedMember.profiles?.full_name ?? '?'}
                avatarUrl={selectedMember.profiles?.avatar_url}
                size="sm"
              />
              <div>
                <p className="text-sm font-medium text-white">{selectedMember.profiles?.full_name ?? 'Usuário'}</p>
                <p className="text-xs text-white/40">@{selectedMember.profiles?.username}</p>
              </div>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 text-yellow-400 font-medium">
                Novo dono
              </span>
            </div>
          )}

          {/* Checkbox de confirmação */}
          {selectedUserId && (
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                className="mt-0.5 accent-yellow-400"
              />
              <span className="text-xs text-white/50 leading-relaxed">
                Entendo que esta ação transfere o controle total do grupo e não pode ser desfeita sem a cooperação do novo dono.
              </span>
            </label>
          )}
        </>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => { setOpen(false); setSelectedUserId(''); setConfirmed(false); setError(null) }}
          disabled={isPending}
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] text-white/60 hover:text-white text-sm font-medium py-2 transition-colors"
        >
          Cancelar
        </button>
        {candidates.length > 0 && (
          <button
            onClick={handleTransfer}
            disabled={!selectedUserId || !confirmed || isPending}
            className="flex-1 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/25 text-sm font-semibold py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Transferir
          </button>
        )}
      </div>
    </div>
  )
}
