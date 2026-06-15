'use client'

import { Users } from 'lucide-react'

interface Team {
  id: string
  name: string
  capacity: number
  confirmed_count: number
}

interface TeamSelectorProps {
  teams: Team[]
  selectedTeamId: string | null
  onSelect: (teamId: string) => void
  disabled?: boolean
}

export function TeamSelector({ teams, selectedTeamId, onSelect, disabled }: TeamSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-white">Escolha seu time</p>
      <div className="grid gap-2">
        {teams.map((team) => {
          const available = team.capacity - team.confirmed_count
          const isFull = available <= 0
          const isSelected = selectedTeamId === team.id
          const pct = Math.min(100, (team.confirmed_count / team.capacity) * 100)

          return (
            <button
              key={team.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(team.id)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="size-3.5 text-white/50" />
                  <span className="font-medium text-sm text-white">{team.name}</span>
                  {isFull && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-400/10 text-red-400 border border-red-400/20">
                      Lotado — entrar na fila
                    </span>
                  )}
                </div>
                <span className={`text-xs font-medium ${isFull ? 'text-red-400' : 'text-white/50'}`}>
                  {isFull ? `Fila` : `${available} vaga${available !== 1 ? 's' : ''}`}
                </span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isFull ? 'bg-red-400' : pct >= 80 ? 'bg-yellow-400' : 'bg-primary'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-white/30">{team.confirmed_count} confirmados</span>
                <span className="text-[10px] text-white/30">{team.capacity} vagas</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
