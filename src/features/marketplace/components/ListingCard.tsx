'use client'

import { useState } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Trash2, Clock, AlertCircle, CheckCircle2, Tag, X, Phone } from 'lucide-react'
import { UserAvatar } from '@/components/ui/user-avatar'
import { deleteListingAction, publishDraftListingAction } from '../actions'
import type { MarketplaceListing } from '../queries'
import { formatPrice } from '@/utils/format'
import { LISTING_TYPES } from '../schemas'

interface Props {
  listing: MarketplaceListing
  isOwner: boolean
  walletBalance?: number
}

const TYPE_COLORS: Record<string, string> = {
  SELL:     'bg-green-500/10 text-green-400 border-green-500/20',
  RENT:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
  BUY:      'bg-orange-500/10 text-orange-400 border-orange-500/20',
  LOAN:     'bg-purple-500/10 text-purple-400 border-purple-500/20',
  EXCHANGE: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  DONATION: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  SERVICE:  'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
}

export function ListingCard({ listing, isOwner, walletBalance = 0 }: Props) {
  const [deleting, setDeleting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [open, setOpen] = useState(false)

  if (deleted) return null

  const profile = listing.profiles as any
  const typeLabel = LISTING_TYPES.find(t => t.value === listing.type)?.label ?? listing.type
  const isDraft = listing.status === 'DRAFT'
  const daysLeft = listing.expires_at
    ? Math.ceil((new Date(listing.expires_at).getTime() - Date.now()) / 86400000)
    : null

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Excluir este anúncio?')) return
    setDeleting(true)
    await deleteListingAction(listing.id)
    setDeleted(true)
  }

  async function handlePublish(e: React.MouseEvent) {
    e.stopPropagation()
    setPublishing(true)
    const res = await publishDraftListingAction(listing.id)
    if (res.error) { alert(res.error); setPublishing(false) }
    else window.location.reload()
  }

  return (
    <>
      {/* Card clicável */}
      <div
        onClick={() => setOpen(true)}
        className={[
          'card-dark rounded-2xl overflow-hidden border transition-all cursor-pointer hover:border-primary/30 hover:scale-[1.01]',
          isDraft ? 'border-yellow-400/20 opacity-80' : 'border-white/[0.07]',
        ].join(' ')}
      >
        {/* Foto */}
        {listing.photo_url && (
          <div className="relative h-44 w-full bg-white/5">
            <Image src={listing.photo_url} alt={listing.title} fill className="object-cover" />
          </div>
        )}

        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={['text-[10px] font-semibold px-2 py-0.5 rounded-full border', TYPE_COLORS[listing.type] ?? ''].join(' ')}>
                  {typeLabel}
                </span>
                {isDraft && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 text-yellow-400 flex items-center gap-1">
                    <AlertCircle className="size-2.5" /> Rascunho
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-white text-sm leading-snug">{listing.title}</h3>
            </div>
            {isOwner && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="shrink-0 text-white/20 hover:text-red-400 transition-colors p-1"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>

          {/* Preço */}
          {(listing.price || listing.price_negotiable) && (
            <p className="text-lg font-bold text-primary leading-none">
              {listing.price_negotiable && !listing.price ? 'A negociar' : null}
              {listing.price && !listing.price_negotiable ? formatPrice(listing.price) : null}
              {listing.price && listing.price_negotiable ? `${formatPrice(listing.price)} (negociável)` : null}
            </p>
          )}

          {/* Descrição truncada */}
          <p className="text-sm text-white/55 leading-relaxed line-clamp-3">{listing.description}</p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <div className="flex items-center gap-2">
              <UserAvatar name={profile?.full_name ?? '?'} avatarUrl={profile?.avatar_url} size="sm" />
              <span className="text-xs text-white/40">{profile?.full_name ?? 'Membro'}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-white/30">
              <Clock className="size-3" />
              {isDraft
                ? 'Rascunho'
                : daysLeft !== null
                  ? `${daysLeft}d restantes`
                  : formatDistanceToNow(new Date(listing.created_at), { locale: ptBR, addSuffix: true })
              }
            </div>
          </div>

          {/* Ação publicar rascunho */}
          {isDraft && isOwner && (
            <button
              onClick={handlePublish}
              disabled={publishing || walletBalance < 100}
              className="w-full rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold py-2 hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="size-3.5" />
              {walletBalance < 100 ? 'Saldo insuficiente para publicar' : 'Publicar agora (R$ 1,00)'}
            </button>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0 sticky top-0 bg-black/80 backdrop-blur-sm z-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <UserAvatar name={profile?.full_name ?? '?'} avatarUrl={profile?.avatar_url} size="sm" />
              <div>
                <p className="text-xs font-semibold text-white/80">{profile?.full_name ?? 'Membro'}</p>
                <p className="text-[10px] text-white/30">
                  {formatDistanceToNow(new Date(listing.created_at), { locale: ptBR, addSuffix: true })}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="size-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Foto em tamanho real */}
          {listing.photo_url && (
            <div className="w-full" onClick={e => e.stopPropagation()}>
              <img
                src={listing.photo_url}
                alt={listing.title}
                className="w-full object-contain max-h-[60vh]"
              />
            </div>
          )}

          {/* Detalhes */}
          <div
            className="flex-1 px-5 py-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Tipo + título */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={['text-[10px] font-semibold px-2 py-0.5 rounded-full border', TYPE_COLORS[listing.type] ?? ''].join(' ')}>
                  {typeLabel}
                </span>
                {isDraft && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 text-yellow-400">
                    Rascunho
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white leading-snug">{listing.title}</h2>
            </div>

            {/* Preço */}
            {(listing.price || listing.price_negotiable) && (
              <p className="text-2xl font-extrabold text-primary leading-none">
                {listing.price_negotiable && !listing.price ? 'A negociar' : null}
                {listing.price && !listing.price_negotiable ? formatPrice(listing.price) : null}
                {listing.price && listing.price_negotiable ? `${formatPrice(listing.price)} (negociável)` : null}
              </p>
            )}

            {/* Descrição completa */}
            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{listing.description}</p>

            {/* Formas de pagamento */}
            {listing.payment_methods && listing.payment_methods.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">Formas de pagamento</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {listing.payment_methods.map(m => (
                    <span key={m} className="text-xs text-white/60 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">{m}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Contato */}
            {listing.contact && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-3">
                <Phone className="size-4 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Contato</p>
                  <p className="text-sm text-white font-medium">{listing.contact}</p>
                </div>
              </div>
            )}

            {/* Validade */}
            {daysLeft !== null && !isDraft && (
              <p className="text-[11px] text-white/25 flex items-center gap-1.5">
                <Clock className="size-3" />
                {daysLeft > 0 ? `Expira em ${daysLeft} dias` : 'Expirado'}
              </p>
            )}

            {/* Publicar rascunho */}
            {isDraft && isOwner && (
              <button
                onClick={handlePublish}
                disabled={publishing || walletBalance < 100}
                className="w-full rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold py-3 hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="size-4" />
                {walletBalance < 100 ? 'Saldo insuficiente para publicar' : 'Publicar agora (R$ 1,00)'}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
