import { notFound } from 'next/navigation'
import { getPublicGroup } from '@/features/grupos/queries-public'
import { formatPrice, formatDateTime } from '@/utils/format'
import { MapPin, Users, Lock, Share2, Calendar } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const group = await getPublicGroup(slug)
  if (!group) return { title: 'Grupo não encontrado' }
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://tanalista.app'}/g/${group.slug ?? group.id}`
  const description = group.description
    ?? `${group.member_count} membros${group.city ? ` em ${group.city}` : ''}${group.category ? ` · ${group.category}` : ''}`
  return {
    title: `${group.name} — TáNaLista`,
    description,
    openGraph: {
      title: group.name,
      description,
      images: group.avatar_url ? [group.avatar_url] : [],
      url,
      type: 'website',
    },
    alternates: { canonical: url },
  }
}

export default async function PublicGroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const group = await getPublicGroup(slug)
  if (!group) notFound()

  // Canonical redirect: UUID → slug
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i
  if (UUID_RE.test(slug) && group.slug && group.slug !== slug) {
    const { redirect } = await import('next/navigation')
    redirect(`/g/${group.slug}`)
  }

  const id = group.id
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://tanalista.app'}/g/${group.slug ?? id}`

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-24">

      {/* Avatar / gradiente */}
      <div
        className="rounded-2xl h-44 flex flex-col items-center justify-center text-center px-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #16532E 0%, #0D3320 60%, #091F14 100%)' }}
      >
        <div className="relative z-10 flex flex-col items-center">
          <div className="size-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-2xl overflow-hidden mb-3">
            {group.avatar_url ? (
              <Image src={group.avatar_url} alt={group.name} width={64} height={64} className="object-cover size-16" />
            ) : (
              group.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex items-center gap-2 mb-1">
            {group.visibility === 'PRIVATE' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-white/70">
                <Lock className="size-2.5" /> Privado
              </span>
            )}
            {group.category && (
              <span className="text-[10px] font-semibold uppercase tracking-widest text-primary/70 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                {group.category}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            {group.name}
          </h1>
        </div>
      </div>

      {/* Infos principais */}
      <div className="card-dark rounded-2xl p-4 space-y-3">
        {group.city && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="size-4 text-primary shrink-0" />
            <span className="text-white">{group.city}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Users className="size-4 text-primary shrink-0" />
          <span className="text-white">{group.member_count} membro{group.member_count !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Descrição */}
      {group.description && (
        <div className="card-dark rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">Sobre o grupo</p>
          <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{group.description}</p>
        </div>
      )}

      {/* Próximos eventos */}
      {group.upcoming_events.length > 0 && (
        <div className="card-dark rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">Próximos eventos</p>
          <div className="space-y-2">
            {group.upcoming_events.map((ev) => (
              <Link
                key={ev.id}
                href={`/e/${ev.slug ?? ev.id}`}
                className="flex items-center gap-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] transition-colors p-3"
              >
                <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Calendar className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{ev.title}</p>
                  <p className="text-xs text-white/40">{formatDateTime(ev.starts_at)}</p>
                </div>
                <span className="text-xs font-semibold text-primary shrink-0">{formatPrice(ev.price)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* CTA fixo no rodapé */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-white/[0.06]" style={{ background: '#0D1A14' }}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="flex-1">
            <p className="text-lg font-bold text-primary">{group.member_count} membro{group.member_count !== 1 ? 's' : ''}</p>
            <p className="text-[10px] text-white/35">
              {group.visibility === 'PRIVATE' ? 'Entrada requer aprovação' : 'Grupo público'}
            </p>
          </div>

          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Oi! Dá uma olhada nesse grupo: ${group.name} — ${shareUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="size-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Share2 className="size-4" />
          </a>

          <Link
            href={`/login?redirect=/grupos/${group.slug ?? id}`}
            className="flex-1 py-3 rounded-xl text-center text-sm font-semibold bg-primary text-background hover:bg-primary/90 transition-colors"
          >
            Entrar no grupo
          </Link>
        </div>
      </div>
    </main>
  )
}
