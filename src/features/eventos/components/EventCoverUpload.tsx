'use client'

import { useRef, useState, useTransition } from 'react'
import { Camera, Loader2, ImagePlus } from 'lucide-react'
import { uploadEventCoverAction } from '../actions'
import { toast } from 'sonner'
import Image from 'next/image'

interface Props {
  eventId: string
  currentCoverUrl: string | null
}

export function EventCoverUpload({ eventId, currentCoverUrl }: Props) {
  const [coverUrl, setCoverUrl] = useState(currentCoverUrl)
  const [preview, setPreview] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    const formData = new FormData()
    formData.append('cover', file)
    formData.append('eventId', eventId)

    startTransition(async () => {
      const res = await uploadEventCoverAction(formData)
      if (res.error) {
        toast.error(res.error)
        setPreview(null)
      } else {
        setCoverUrl(res.coverUrl ?? null)
        setPreview(null)
        toast.success('Foto de capa atualizada!')
      }
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  const display = preview ?? coverUrl

  return (
    <div className="relative group cursor-pointer" onClick={() => inputRef.current?.click()}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {display ? (
        <div className="relative rounded-2xl overflow-hidden h-44">
          <Image
            src={display}
            alt="Capa do evento"
            fill
            className="object-cover"
            unoptimized={!!preview}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {isPending
              ? <Loader2 className="size-8 text-white animate-spin" />
              : <Camera className="size-8 text-white" />
            }
          </div>
          {/* Badge de editar sempre visível (pequeno) */}
          {!isPending && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
              <Camera className="size-3 text-white/70" />
              <span className="text-[10px] text-white/70">Alterar capa</span>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl h-44 border-2 border-dashed border-white/15 hover:border-primary/40 transition-colors flex flex-col items-center justify-center gap-2 bg-white/[0.02]">
          {isPending ? (
            <Loader2 className="size-7 text-primary animate-spin" />
          ) : (
            <>
              <ImagePlus className="size-7 text-white/25" />
              <p className="text-sm text-white/40">Adicionar foto de capa</p>
              <p className="text-xs text-white/20">JPG, PNG ou WebP · máx. 5 MB</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
