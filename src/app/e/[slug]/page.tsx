import { notFound } from 'next/navigation'
import { getPublicEvent } from '@/features/eventos/queries-public'
import { EventCountdown } from '@/features/eventos/components/EventCountdown'
import { formatPrice, formatDateTime } from '@/utils/format'
import { MapPin, Calendar, Users, Clock, Share2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

const AVATAR_COLORS = ['bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 'bg-orange-600', 'bg-rose-600', 'bg-teal-600']
function colorFor(name: string) {
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Inscrições abertas',
  CONFIRMED: 'Confirmado',
  PENDING: 'Aguardando mínimo',
  COMPLETED: 'Encerrado',
  CANCELLED: 'Cancelado',
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const event = await getPublicEvent(slug)
  if (!event) return { title: 'Evento não encontrado' }
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://tanalista.app'}/e/${event.slug ?? event.id}`
  return {
    title: `${event.title} — TáNaLista`,
    description: event.description ?? `${event.city} · ${formatDateTime(event.starts_at)}`,
    openGraph: {
      title: event.title,
      description: event.description ?? `Evento em ${event.city}`,
      images: event.cover_url ? [event.cover_url] : [],
      url,
      type: 'website',
    },
    alternates: { canonical: url },
  }
}

export default async function PublicEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getPublicEvent(slug)
  if (!event) notFound()

  // Canonical redirect: UUID → slug
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i
  if (UUID_RE.test(slug) && event.slug && event.slug !== slug) {
    const { redirect } = await import('next/navigation')
    redirect(`/e/${event.slug}`)
  }

  const id = event.id
  const isOpen = event.status === 'OPEN'
  const isFull = event.confirmed_count >= event.capacity
  const isPast = new Date(event.starts_at) < new Date()
  const spotsLeft = event.capacity - event.confirmed_count
  const occupancyPct = Math.round((event.confirmed_count / event.capacity) * 100)

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://tanalista.app'}/e/${event.slug ?? id}`

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-24">

      {/* Cover / gradiente */}
      <div
        className="rounded-2xl h-44 flex flex-col items-center justify-center text-center px-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #16532E 0%, #0D3320 60%, #091F14 100%)' }}
      >
        {event.category && (
          <span className="text-[10px] font-semibold uppercase tracking-widest text-primary/70 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-3">
            {event.category}
          </span>
        )}
        <h1 className="text-2xl font-bold text-white leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
          {event.title}
        </h1>
        {event.groups && (
          <p className="text-sm text-white/50 mt-1">{event.groups.name}</p>
        )}
      </div>

      {/* Countdown */}
      {!isPast && (
        <div className="card-dark rounded-2xl p-4 space-y-2">
          <p className="text-[10px] text-white/35 text-center uppercase tracking-widest">Começa em</p>
          <EventCountdown startsAt={event.starts_at} />
        </div>
      )}

      {/* Infos principais */}
      <div className="card-dark rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="size-4 text-primary shrink-0" />
          <span className="text-white">{formatDateTime(event.starts_at)}</span>
        </div>
        {event.ends_at && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="size-4 text-primary shrink-0" />
            <span className="text-white/70">Término: {formatDateTime(event.ends_at)}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="size-4 text-primary shrink-0" />
          <span className="text-white">{event.address} — {event.city}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users className="size-4 text-primary shrink-0" />
          <span className="text-white">{event.confirmed_count}/{event.capacity} confirmados
            {event.waitlist_count > 0 && <span className="text-white/40"> · {event.waitlist_count} na fila</span>}
          </span>
        </div>

        {/* Barra de ocupação */}
        <div className="space-y-1">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min(occupancyPct, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-white/30">
            {isFull ? 'Evento lotado' : `${spotsLeft} vaga${spotsLeft !== 1 ? 's' : ''} disponíve${spotsLeft !== 1 ? 'is' : 'l'}`}
          </p>
        </div>
      </div>

      {/* Participantes confirmados */}
      {event.confirmed_participants.length > 0 && (
        <div className="card-dark rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">Quem vai</p>
          <div className="flex flex-wrap gap-2">
            {event.confirmed_participants.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {p.avatarUrl ? (
                  <Image
                    src={p.avatarUrl}
                    alt={p.name}
                    width={28}
                    height={28}
                    className="size-7 rounded-full object-cover"
                  />
                ) : (
                  <div className={`size-7 rounded-full ${colorFor(p.name)} flex items-center justify-center text-[10px] font-bold text-white`}>
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-white/70">{p.name.split(' ')[0]}</span>
              </div>
            ))}
            {event.confirmed_count > 8 && (
              <div className="flex items-center gap-1.5">
                <div className="size-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/50">
                  +{event.confirmed_count - 8}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Descrição */}
      {event.description && (
        <div className="card-dark rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">Sobre o evento</p>
          <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{event.description}</p>
        </div>
      )}

      {/* Organizador */}
      {event.organizer && (
        <p className="text-xs text-white/30 text-center">
          Organizado por <strong className="text-white/50">@{event.organizer.username}</strong>
        </p>
      )}

      {/* Prazo */}
      {isOpen && !isPast && (
        <p className="text-xs text-white/30 text-center">
          Inscrições até{' '}
          {format(new Date(event.registration_deadline), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      )}

      {/* CTA fixo no rodapé */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-white/[0.06]" style={{ background: '#0D1A14' }}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="flex-1">
            <p className="text-lg font-bold text-primary">{formatPrice(event.price)}</p>
            <p className="text-[10px] text-white/35">
              {STATUS_LABEL[event.status] ?? event.status}
            </p>
          </div>

          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Oi! Dá uma olhada nesse evento: ${event.title} — ${shareUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="size-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Share2 className="size-4" />
          </a>

          {isOpen && !isFull ? (
            <Link
              href={`/login?redirect=/eventos/${event.slug ?? id}`}
              className="flex-1 py-3 rounded-xl text-center text-sm font-semibold bg-primary text-background hover:bg-primary/90 transition-colors"
            >
              Quero participar
            </Link>
          ) : isFull ? (
            <Link
              href={`/login?redirect=/eventos/${event.slug ?? id}`}
              className="flex-1 py-3 rounded-xl text-center text-sm font-semibold bg-white/5 border border-white/10 text-white/40"
            >
              Entrar na fila
            </Link>
          ) : (
            <div className="flex-1 py-3 rounded-xl text-center text-sm font-semibold bg-white/5 text-white/30">
              {STATUS_LABEL[event.status] ?? 'Encerrado'}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
