const STATUS_CONFIG = {
  DRAFT:     { label: 'Rascunho',   dot: 'bg-white/30',   cls: 'text-white/40 bg-white/5 border-white/8' },
  OPEN:      { label: 'Aberto',     dot: 'bg-sky-400',    cls: 'text-sky-400 bg-sky-400/8 border-sky-400/20' },
  PENDING:   { label: 'Pendente',   dot: 'bg-yellow-400', cls: 'text-yellow-400 bg-yellow-400/8 border-yellow-400/20' },
  CONFIRMED: { label: 'Confirmado', dot: 'bg-primary',    cls: 'text-primary bg-primary/8 border-primary/20' },
  COMPLETED: { label: 'Realizado',  dot: 'bg-white/25',   cls: 'text-white/35 bg-white/4 border-white/8' },
  CANCELLED: { label: 'Cancelado',  dot: 'bg-red-400',    cls: 'text-red-400 bg-red-400/8 border-red-400/18' },
  WAITLIST:  { label: 'Fila',       dot: 'bg-white/30',   cls: 'text-white/40 bg-white/4 border-white/8' },
} as const

type Status = keyof typeof STATUS_CONFIG

export function EventStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as Status] ?? STATUS_CONFIG.DRAFT
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.03em] px-2.5 py-1 rounded-full border ${cfg.cls}`}>
      <span className={`size-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
