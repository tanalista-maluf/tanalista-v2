'use client'

import { useEffect, useState } from 'react'

interface Props {
  startsAt: string
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function EventCountdown({ startsAt }: Props) {
  const [diff, setDiff] = useState<number | null>(null)

  useEffect(() => {
    const target = new Date(startsAt).getTime()
    const tick = () => setDiff(target - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startsAt])

  if (diff === null) return null
  if (diff <= 0) return (
    <div className="text-center py-3">
      <span className="text-sm font-semibold text-primary">Evento em andamento!</span>
    </div>
  )

  const totalSecs = Math.floor(diff / 1000)
  const days  = Math.floor(totalSecs / 86400)
  const hours = Math.floor((totalSecs % 86400) / 3600)
  const mins  = Math.floor((totalSecs % 3600) / 60)
  const secs  = totalSecs % 60

  const units = days > 0
    ? [{ label: 'dias', value: days }, { label: 'horas', value: hours }, { label: 'min', value: mins }]
    : [{ label: 'horas', value: hours }, { label: 'min', value: mins }, { label: 'seg', value: secs }]

  return (
    <div className="flex items-center justify-center gap-3">
      {units.map(({ label, value }, i) => (
        <div key={label} className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-primary tabular-nums leading-none">{pad(value)}</span>
            <span className="text-[10px] text-white/35 uppercase tracking-widest mt-1">{label}</span>
          </div>
          {i < units.length - 1 && (
            <span className="text-2xl font-bold text-white/20 mb-3">:</span>
          )}
        </div>
      ))}
    </div>
  )
}
