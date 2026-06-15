'use client'

import { useState, useRef } from 'react'
import { Camera, X, Loader2, ImageOff } from 'lucide-react'
import { uploadEventPhotoAction, deleteEventPhotoAction } from '../actions'
import { toast } from 'sonner'
import { UserAvatar } from '@/components/ui/user-avatar'

interface Photo {
  id: string
  storage_path: string
  caption: string | null
  created_at: string
  profiles: { full_name?: string | null; username?: string | null; avatar_url?: string | null } | null
}

interface Props {
  eventId: string
  photos: Photo[]
  canUpload: boolean
  currentUserId: string
  isOrganizer: boolean
}

export function EventGallery({ eventId, photos: initial, canUpload, currentUserId, isOrganizer }: Props) {
  const [photos, setPhotos] = useState(initial)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const fd = new FormData()
    fd.append('photo', file)
    const result = await uploadEventPhotoAction(eventId, fd)
    setUploading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Foto enviada!')
      // Adicionar otimisticamente
      setPhotos(prev => [{
        id: Date.now().toString(),
        storage_path: result.url!,
        caption: null,
        created_at: new Date().toISOString(),
        profiles: null,
      }, ...prev])
    }
    e.target.value = ''
  }

  async function handleDelete(photoId: string) {
    const result = await deleteEventPhotoAction(photoId, eventId)
    if (result.error) toast.error(result.error)
    else setPhotos(prev => prev.filter(p => p.id !== photoId))
  }

  return (
    <div className="space-y-4">
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
            disabled={uploading}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            {uploading ? 'Enviando...' : 'Adicionar foto'}
          </button>
        </div>
      )}

      {photos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-white/20">
          <ImageOff className="size-10" />
          <p className="text-sm">Nenhuma foto ainda.{canUpload ? ' Seja o primeiro!' : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map(photo => (
            <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden bg-white/5">
              <img
                src={photo.storage_path}
                alt=""
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setLightbox(photo.storage_path)}
              />
              {/* Overlay com autor */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {photo.profiles && (
                  <div className="flex items-center gap-1.5">
                    <UserAvatar
                      name={photo.profiles.full_name ?? photo.profiles.username ?? '?'}
                      avatarUrl={photo.profiles.avatar_url ?? null}
                      size="xs"
                    />
                    <span className="text-[10px] text-white/80 truncate">
                      {photo.profiles.full_name ?? photo.profiles.username}
                    </span>
                  </div>
                )}
              </div>
              {/* Botão deletar */}
              {(photo.profiles === null || isOrganizer) && (
                <button
                  onClick={() => handleDelete(photo.id)}
                  className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/60 flex items-center justify-center text-white/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 text-white/60 hover:text-white">
            <X className="size-6" />
          </button>
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
