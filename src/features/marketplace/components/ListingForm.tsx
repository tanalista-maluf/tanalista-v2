'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { listingSchema, type ListingSchema, LISTING_TYPES, PAYMENT_METHODS } from '../schemas'
import { createListingAction, createListingPhotoUploadAction } from '../actions'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, AlertCircle, CheckCircle2, Wallet, ImagePlus, X } from 'lucide-react'
import { formatPrice, formatBalance } from '@/utils/format'
import Image from 'next/image'

const MAX_PHOTOS = 5
const MAX_PHOTO_BYTES = 4 * 1024 * 1024

// A foto vai direto do navegador para o Storage, por um link assinado do servidor
async function uploadPhoto(file: File): Promise<string> {
  const slot = await createListingPhotoUploadAction({ mimeType: file.type, size: file.size })
  if ('error' in slot) throw new Error(slot.error)
  const { error } = await createClient()
    .storage.from('listing-photos')
    .uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type })
  if (error) throw new Error('Erro ao enviar a foto. Tente novamente.')
  return slot.url
}

interface Props {
  groupId: string
  walletBalance: number
  activeCount: number
  onSuccess: () => void
}

const LISTING_COST = 100

export function ListingForm({ groupId, walletBalance, activeCount, onSuccess }: Props) {
  const [serverResult, setServerResult] = useState<{ error?: string; insufficientBalance?: boolean; isDraft?: boolean } | null>(null)
  // Até 5 fotos; a primeira é a principal
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ListingSchema>({
    resolver: zodResolver(listingSchema),
    defaultValues: { type: 'SELL', price_negotiable: false, payment_methods: [] },
  })

  const selectedPayments = watch('payment_methods') ?? []
  const priceNegotiable = watch('price_negotiable')
  const type = watch('type')

  function togglePayment(method: string) {
    const current = selectedPayments
    setValue(
      'payment_methods',
      current.includes(method) ? current.filter(m => m !== method) : [...current, method]
    )
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - photos.length)
    e.target.value = ''
    if (files.length === 0) return
    const tooBig = files.filter((file) => file.size > MAX_PHOTO_BYTES).length
    if (tooBig) setServerResult({ error: tooBig === 1 ? 'Uma foto passou de 4MB e ficou de fora.' : `${tooBig} fotos passaram de 4MB e ficaram de fora.` })
    setUploading(true)
    try {
      for (const file of files.filter((item) => item.size <= MAX_PHOTO_BYTES)) {
        const url = await uploadPhoto(file)
        setPhotos((current) => {
          const next = [...current, url]
          setValue('photo_urls', next)
          return next
        })
      }
    } catch (err) {
      setServerResult({ error: err instanceof Error ? err.message : 'Erro ao enviar imagem. Tente novamente.' })
    } finally {
      setUploading(false)
    }
  }

  function updatePhotos(next: string[]) {
    setPhotos(next)
    setValue('photo_urls', next)
  }

  async function onSubmit(data: ListingSchema) {
    setServerResult(null)
    const res = await createListingAction(groupId, data)
    if (res.error) { setServerResult({ error: res.error }); return }
    if (res.insufficientBalance) { setServerResult({ insufficientBalance: true, isDraft: true }); return }
    onSuccess()
  }

  const hasBalance = walletBalance >= LISTING_COST
  const atLimit = activeCount >= 5

  if (atLimit) {
    return (
      <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 flex gap-3">
        <AlertCircle className="size-4 text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-400">Você atingiu o limite de 5 anúncios ativos neste grupo.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Custo e saldo */}
      <div className={[
        'rounded-xl border p-3.5 flex items-center gap-3',
        hasBalance ? 'border-primary/20 bg-primary/5' : 'border-red-400/20 bg-red-400/5',
      ].join(' ')}>
        <Wallet className={['size-4 shrink-0', hasBalance ? 'text-primary' : 'text-red-400'].join(' ')} />
        <div className="flex-1 text-xs">
          <p className={hasBalance ? 'text-white/70' : 'text-red-300'}>
            Custo: <span className="font-semibold">R$ 1,00</span> por anúncio (debitado da carteira)
          </p>
          <p className={hasBalance ? 'text-white/40' : 'text-red-400'}>
            Seu saldo: <span className="font-semibold">{formatBalance(walletBalance)}</span>
            {!hasBalance && ' — saldo insuficiente, anúncio será salvo como rascunho'}
          </p>
        </div>
      </div>

      {serverResult?.error && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 flex gap-2">
          <AlertCircle className="size-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{serverResult.error}</p>
        </div>
      )}

      {serverResult?.isDraft && (
        <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-3 flex gap-2">
          <AlertCircle className="size-4 text-yellow-400 shrink-0" />
          <p className="text-sm text-yellow-300">Saldo insuficiente. Anúncio salvo como rascunho. Adicione saldo na carteira para publicar.</p>
        </div>
      )}

      {/* Tipo */}
      <div className="space-y-1.5">
        <Label>Tipo de anúncio *</Label>
        <div className="grid grid-cols-2 gap-2">
          {LISTING_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setValue('type', t.value)}
              className={[
                'rounded-lg border p-2.5 text-left text-sm transition-colors',
                type === t.value
                  ? 'border-primary/40 bg-primary/8 text-primary'
                  : 'border-white/10 text-white/60 hover:border-white/20',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Título */}
      <div className="space-y-1.5">
        <Label htmlFor="title">Título *</Label>
        <Input id="title" placeholder="Ex: Chuteira Society tamanho 42" {...register('title')} aria-invalid={!!errors.title} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      {/* Descrição */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Descrição *</Label>
        <Textarea
          id="description"
          placeholder="Descreva o item, condições de uso, estado, detalhes importantes..."
          rows={4}
          {...register('description')}
          aria-invalid={!!errors.description}
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>

      {/* Preço */}
      {type !== 'DONATION' && type !== 'BUY' && (
        <div className="space-y-2">
          <Label>Valor</Label>
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">R$</span>
              <Input
                placeholder="0,00"
                className="pl-8"
                disabled={priceNegotiable}
                {...register('price')}
              />
            </div>
            <Controller
              name="price_negotiable"
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={[
                    'rounded-lg border px-3 py-2 text-xs font-medium transition-colors shrink-0',
                    field.value
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-white/10 text-white/50 hover:border-white/20',
                  ].join(' ')}
                >
                  A negociar
                </button>
              )}
            />
          </div>
        </div>
      )}

      {/* Formas de pagamento */}
      {type !== 'LOAN' && type !== 'EXCHANGE' && type !== 'BUY' && (
        <div className="space-y-1.5">
          <Label>Formas de pagamento</Label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => togglePayment(m)}
                className={[
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  selectedPayments.includes(m)
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-white/10 text-white/50 hover:border-white/20',
                ].join(' ')}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fotos */}
      <div className="space-y-1.5">
        <Label>Fotos <span className="text-white/40 text-xs">({photos.length}/{MAX_PHOTOS}, opcional)</span></Label>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, index) => (
            <div key={url} className={['relative rounded-xl overflow-hidden aspect-square bg-white/5', index === 0 ? 'ring-2 ring-primary' : ''].join(' ')}>
              <Image src={url} alt={`Foto ${index + 1}`} fill className="object-cover" />
              {index === 0 ? (
                <span className="absolute bottom-0 inset-x-0 bg-primary/90 text-background text-[10px] font-bold text-center py-0.5">Principal</span>
              ) : (
                <button
                  type="button"
                  onClick={() => updatePhotos([url, ...photos.filter((item) => item !== url)])}
                  className="absolute bottom-1 inset-x-1 rounded-md bg-black/60 text-[10px] text-white py-0.5 hover:bg-black/80">
                  Tornar principal
                </button>
              )}
              <button
                type="button"
                aria-label="Remover foto"
                onClick={() => updatePhotos(photos.filter((item) => item !== url))}
                className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors">
                <X className="size-3 text-white" />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className={[
              'flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-white/10 aspect-square cursor-pointer transition-colors hover:border-primary/30 hover:bg-primary/5',
              uploading ? 'opacity-60 pointer-events-none' : '',
            ].join(' ')}>
              {uploading
                ? <Loader2 className="size-5 text-white/40 animate-spin" />
                : <ImagePlus className="size-5 text-white/30" />
              }
              <span className="text-[11px] text-white/40">{uploading ? 'Enviando...' : 'Adicionar'}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={handlePhotoChange} disabled={uploading} />
            </label>
          )}
        </div>
        <p className="text-xs text-white/40">Até {MAX_PHOTOS} fotos de até 4MB cada. A primeira é a principal.</p>
      </div>

      {/* Contato */}
      <div className="space-y-1.5">
        <Label htmlFor="contact">Como entrar em contato <span className="text-white/40 text-xs">(opcional)</span></Label>
        <Input id="contact" placeholder="WhatsApp, Instagram, e-mail..." {...register('contact')} />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {hasBalance ? 'Publicar anúncio (R$ 1,00)' : 'Salvar como rascunho'}
      </Button>
    </form>
  )
}
