'use client'

import { useState } from 'react'
import { ArrowLeftRight, X } from 'lucide-react'
import { TeamSelector } from './TeamSelector'
import { changeTeamAction, changeWaitlistTeamAction } from '../actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface Team {
  id: string
  name: string
  capacity: number
  confirmed_count: number
}

interface ChangeTeamButtonProps {
  participationId?: string
  waitlistId?: string
  currentTeamId: string
  currentTeamName: string
  teams: Team[]
  changesUsed?: number
  isWaitlist?: boolean
}

export function ChangeTeamButton({
  participationId,
  waitlistId,
  currentTeamId,
  currentTeamName,
  teams,
  changesUsed = 0,
  isWaitlist = false,
}: ChangeTeamButtonProps) {
  const [open, setOpen] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const canChange = isWaitlist || changesUsed < 1

  if (!canChange) {
    return (
      <span className="text-[10px] text-white/30 flex items-center gap-1">
        <ArrowLeftRight className="size-3" />
        Troca usada
      </span>
    )
  }

  async function handleConfirm() {
    if (!selectedTeamId) return
    setLoading(true)

    const result = isWaitlist
      ? await changeWaitlistTeamAction(waitlistId!, selectedTeamId)
      : await changeTeamAction(participationId!, selectedTeamId)

    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(isWaitlist ? 'Fila alterada!' : 'Time alterado com sucesso!')
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
      >
        <ArrowLeftRight className="size-3" />
        {isWaitlist ? 'Mudar fila' : 'Trocar time'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-lg bg-[#0D1A14] border border-white/10 rounded-t-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">
                {isWaitlist ? 'Mudar de fila' : 'Trocar de time'}
              </h3>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
                <X className="size-5" />
              </button>
            </div>

            <p className="text-xs text-white/50">
              Time atual: <span className="text-white font-medium">{currentTeamName}</span>
              {!isWaitlist && <span className="text-white/30"> · {1 - changesUsed} troca restante</span>}
            </p>

            <TeamSelector
              teams={teams.filter((t) => t.id !== currentTeamId)}
              selectedTeamId={selectedTeamId}
              onSelect={setSelectedTeamId}
              disabled={loading}
            />

            <Button
              className="w-full"
              disabled={!selectedTeamId || loading}
              onClick={handleConfirm}
            >
              Confirmar
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
