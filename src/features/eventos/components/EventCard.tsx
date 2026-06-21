import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MapPin, Users, Lock, Star } from 'lucide-react'
import { EventStatusBadge } from './EventStatusBadge'

interface EventCardProps {
  event: {
    id: string
    slug?: string | null
    title: string
    city: string
    address: string
    starts_at: string
    price: number
    capacity: number
    status: string
    category: string | null
    visibility?: string | null
    rating_average?: number | null
    rating_count?: number | null
  }
  confirmedCount?: number
  groupName?: string
}

function formatPrice(cents: number) {
  if (cents === 0) return 'Gratuito'
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function getAccentColor(status: string, pct: number) {
  if (['CANCELLED', 'COMPLETED'].includes(status)) return 'bg-white/15'
  if (pct >= 1) return 'bg-red-400'
  if (pct >= 0.8) return 'bg-yellow-400'
  return 'bg-gradient-to-b from-primary to-emerald-500'
}

export function EventCard({ event, confirmedCount, groupName }: EventCardProps) {
  const startsAt = new Date(event.starts_at)
  const day = startsAt.getDate()
  const mon = format(startsAt, 'MMM', { locale: ptBR }).replace('.', '')
  const timeStr = format(startsAt, 'HH:mm', { locale: ptBR })
  const occupancy = confirmedCount ?? 0
  const pct = event.capacity > 0 ? occupancy / event.capacity : 0
  const isFull = pct >= 1
  const isGratis = event.price === 0
  const isDead = ['CANCELLED', 'COMPLETED'].includes(event.status)
  const isAlmostFull = !isFull && pct >= 0.8

  return (
    <Link href={`/eventos/${event.slug ?? event.id}`} className="block">
      <div className={`card-dark rounded-2xl flex items-stretch overflow-hidden relative ${isFull && !isDead ? 'opacity-75' : ''}`}>
        {/* Badge esgotado — overlay no canto superior direito */}
        {isFull && !isDead && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-red-900/30">
            Esgotado
          </div>
        )}

        {/* Accent bar lateral */}
        <div className={`card-accent-bar ${getAccentColor(event.status, pct)}`} />

        {/* Bloco de data */}
        <div className="w-14 min-w-14 flex flex-col items-center justify-center py-4 border-r border-white/[0.06] shrink-0">
          <span className={`text-2xl font-extrabold leading-none tracking-tight ${isDead ? 'text-white/25' : isFull ? 'text-red-400/70' : 'text-primary'}`}>{day}</span>
          <span className={`text-xs font-semibold capitalize mt-0.5 ${isDead ? 'text-white/20' : isFull ? 'text-red-400/40' : 'text-primary/60'}`}>{mon}</span>
          <span className="text-xs text-white/25 mt-1">{timeStr}</span>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 px-3.5 py-3">
          <div className="space-y-0.5">
            <div className={`flex items-start gap-1.5 font-bold text-sm leading-snug ${isDead ? 'text-white/35 line-through' : 'text-white'}`}>
              <span className="line-clamp-2">{event.title}</span>
              {event.visibility && event.visibility !== 'PUBLIC' && (
                <Lock className="size-3 shrink-0 text-white/30 mt-0.5" />
              )}
            </div>
            {groupName && (
              <p className="text-xs text-white/30 truncate">{groupName}</p>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-white/35">
              <MapPin className="size-3 shrink-0" />
              {event.city}
            </span>
            <span className="flex items-center gap-1 text-xs text-white/35">
              <Users className="size-3 shrink-0" />
              {occupancy}/{event.capacity}
            </span>
            {event.rating_average != null && event.rating_count != null && event.rating_count > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-yellow-400/80">
                <Star className="size-3 fill-yellow-400/70 shrink-0" />
                {event.rating_average.toFixed(1)}
              </span>
            )}
          </div>

          {event.capacity > 0 && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isFull ? 'bg-red-400' : pct >= 0.8 ? 'bg-yellow-400' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(100, pct * 100)}%` }}
                />
              </div>
              {isAlmostFull && (
                <span className="text-[10px] font-semibold shrink-0 text-yellow-400/80">
                  Últimas {event.capacity - occupancy}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Preço + badge */}
        <div className={`flex flex-col items-end justify-center gap-1.5 pr-4 pl-1 shrink-0 ${isFull && !isDead ? 'pr-4 pt-5' : ''}`}>
          {!isFull && (
            <span className={`text-sm font-bold px-2.5 py-1 rounded-full border ${
              isDead
                ? 'text-white/25 bg-white/4 border-white/8 line-through'
                : isGratis
                ? 'text-yellow-400 bg-yellow-400/8 border-yellow-400/18'
                : 'text-primary bg-primary/8 border-primary/18'
            }`}>
              {formatPrice(event.price)}
            </span>
          )}
          <EventStatusBadge status={event.status} />
        </div>
      </div>
    </Link>
  )
}
