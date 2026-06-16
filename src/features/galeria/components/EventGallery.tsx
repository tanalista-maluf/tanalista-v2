'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, X, Loader2, ImageOff, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { uploadEventPhotoAction, deleteEventPhotoAction } from '../actions'
import { toast } from 'sonner'
import { UserAvatar } from '@/components/ui/user-avatar'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Photo {
  id: string
  storage_path: string
  file_size: number | null
  created_at: string
  profiles: { full_name?: string | null; username?: string | null; avatar_url?: string | null } | null
}

interface StorageUsage {
  usedMB: number
  limitMB: number
  percent: number
}

interface Props {
  eventId: string
  photos: Photo[]
  canUpload: boolean
  currentUserId: string
  isOrganizer: boolean
  storageUsage: StorageUsage
}

async function compressImage(file: File, maxSizeKB = 800): Promise<File> {
  if (file.size <= maxSizeKB * 1024) return file

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      const maxDim = 1920
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * maxDim / width); width = maxDim }
        else { width = Math.round(width * maxDim / height); height = maxDim }
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file),
        'image/jpeg', 0.82
      )
    }
    img.src = url
  })
}

export function EventGallery({ eventId, photos: initial, canUpload, currentUserId, isOrganizer, storageUsage: initialUsage }: Props) {
  const [photos, setPhotos] = useState(initial)
  const [usage, setUsage] = useState(initialUsage)
  const [uploading, setUploading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const lightboxPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const compressed = await compressImage(file)
      const fd = new FormData()
      fd.append('photo', compressed)
      const result = await uploadEventPhotoAction(eventId, fd)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Foto enviada!')
        const newPhoto: Photo = {
          id: Date.now().toString(),
          storage_path: result.url!,
          file_size: compressed.size,
          created_at: new Date().toISOString(),
          profiles: null,
        }
        setPhotos(prev => [newPhoto, ...prev])
        setUsage(prev => {
          const newUsed = prev.usedMB + compressed.size / 1024 / 1024
          return { ...prev, usedMB: +newUsed.toFixed(1), percent: Math.min(100, Math.round(newUsed / prev.limitMB * 100)) }
        })
      }
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDelete(photoId: string, fileSize: number | null) {
    setDeletingId(photoId)
    const result = await deleteEventPhotoAction(photoId, eventId)
    setDeletingId(null)
    if (result.error) {
      toast.error(result.error)
    } else {
      setPhotos(prev => prev.filter(p => p.id !== photoId))
      if (fileSize) {
        setUsage(prev => {
          const newUsed = Math.max(0, prev.usedMB - fileSize / 1024 / 1024)
          return { ...prev, usedMB: +newUsed.toFixed(1), percent: Math.min(100, Math.round(newUsed / prev.limitMB * 100)) }
        })
      }
      if (lightboxIndex !== null) setLightboxIndex(null)
    }
  }

  async function handleDownload(url: string) {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `foto-${Date.now()}.jpg`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      toast.error('Erro ao baixar foto.')
    }
  }

  const navLightbox = useCallback((dir: 1 | -1) => {
    setLightboxIndex(i => i === null ? null : Math.max(0, Math.min(photos.length - 1, i + dir)))
  }, [photos.length])

  const storageColor = usage.percent >= 90 ? 'bg-red-400' : usage.percent >= 70 ? 'bg-yellow-400' : 'bg-primary'

  return (
    <div className="space-y-4">
      {/* Barra de uso de storage */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/30 font-medium uppercase tracking-wide">Armazenamento do evento</span>
          <span className="text-[10px] text-white/40">{usage.usedMB} MB / {usage.limitMB} MB</span>
        </div>
        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${storageColor}`} style={{ width: `${usage.percent}%` }} />
        </div>
        <p className="text-[9px] text-white/20">Fotos disponíveis por 1 mês após o evento. Após esse período são excluídas automaticamente.</p>
      </div>

      {/* Botão de upload */}
      {canUpload && (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || usage.percent >= 100}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-40"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            {uploading ? 'Comprimindo e enviando...' : 'Adicionar foto'}
          </button>
        </div>
      )}

      {photos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-white/20">
          <ImageOff className="size-10" />
          <p className="text-sm">Nenhuma foto ainda.{canUpload ? ' Seja o primeiro!' : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((photo, idx) => (
            <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden bg-white/5">
              <img
                src={photo.storage_path}
                alt=""
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setLightboxIndex(idx)}
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {photo.profiles && (
                  <div className="flex items-center gap-1">
                    <UserAvatar
                      name={photo.profiles.full_name ?? photo.profiles.username ?? '?'}
                      avatarUrl={photo.profiles.avatar_url ?? null}
                      size="xs"
                    />
                    <span className="text-[9px] text-white/70 truncate">
                      {photo.profiles.full_name ?? photo.profiles.username}
                    </span>
                  </div>
                )}
              </div>
              {(photo.profiles === null || photo.profiles === undefined || isOrganizer) && (
                <button
                  onClick={() => handleDelete(photo.id, photo.file_size)}
                  disabled={deletingId === photo.id}
                  className="absolute top-1 right-1 size-5 rounded-full bg-black/70 flex items-center justify-center text-white/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  {deletingId === photo.id ? <Loader2 className="size-2.5 animate-spin" /> : <X className="size-2.5" />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              {lightboxPhoto.profiles && (
                <>
                  <UserAvatar
                    name={lightboxPhoto.profiles.full_name ?? lightboxPhoto.profiles.username ?? '?'}
                    avatarUrl={lightboxPhoto.profiles.avatar_url ?? null}
                    size="xs"
                  />
                  <div>
                    <p className="text-[11px] font-semibold text-white/80">{lightboxPhoto.profiles.full_name ?? lightboxPhoto.profiles.username}</p>
                    <p className="text-[10px] text-white/30">{format(new Date(lightboxPhoto.created_at), "d 'de' MMM", { locale: ptBR })}</p>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload(lightboxPhoto.storage_path)}
                className="size-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                title="Baixar foto"
              >
                <Download className="size-4" />
              </button>
              {(isOrganizer || lightboxPhoto.profiles === null) && (
                <button
                  onClick={() => handleDelete(lightboxPhoto.id, lightboxPhoto.file_size)}
                  disabled={deletingId === lightboxPhoto.id}
                  className="size-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {deletingId === lightboxPhoto.id ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                </button>
              )}
              <button
                onClick={() => setLightboxIndex(null)}
                className="size-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Imagem */}
          <div className="flex-1 flex items-center justify-center relative px-4" onClick={e => e.stopPropagation()}>
            {lightboxIndex > 0 && (
              <button
                onClick={() => navLightbox(-1)}
                className="absolute left-2 size-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors z-10"
              >
                <ChevronLeft className="size-5" />
              </button>
            )}
            <img
              src={lightboxPhoto.storage_path}
              alt=""
              className="max-w-full max-h-full rounded-xl object-contain"
            />
            {lightboxIndex < photos.length - 1 && (
              <button
                onClick={() => navLightbox(1)}
                className="absolute right-2 size-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors z-10"
              >
                <ChevronRight className="size-5" />
              </button>
            )}
          </div>

          {/* Counter */}
          <div className="text-center py-3">
            <span className="text-[11px] text-white/30">{lightboxIndex + 1} / {photos.length}</span>
          </div>
        </div>
      )}
    </div>
  )
}
