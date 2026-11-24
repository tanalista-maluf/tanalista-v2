'use client'

import { useRef, useState, useTransition } from 'react'
import { Camera, Loader2, ImagePlus, X } from 'lucide-react'
import { uploadPostSignupMessageImageAction, removePostSignupMessageImageAction } from '../actions'
import { toast } from 'sonner'
import Image from 'next/image'

interface Props {
  eventId: string
  currentImageUrl: string | null
}

// Imagem opcional do popup pós-inscrição (ver PostSignupMessageDialog) —
// mesmo padrão do EventCoverUpload, upload imediato sem passar pelo form
export function PostSignupMessageImageUpload({ eventId, currentImageUrl }: Props) {
  const [imageUrl, setImageUrl] = useState(currentImageUrl)
  const [preview, setPreview] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 1 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 1 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    const formData = new FormData()
    formData.append('image', file)
    formData.append('eventId', eventId)

    startTransition(async () => {
      const res = await uploadPostSignupMessageImageAction(formData)
      if (res.error) {
        toast.error(res.error)
        setPreview(null)
      } else {
        setImageUrl(res.imageUrl ?? null)
        setPreview(null)
        toast.success('Imagem do popup atualizada!')
      }
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    startTransition(async () => {
      const res = await removePostSignupMessageImageAction(eventId)
      if (res.error) toast.error(res.error)
      else {
        setImageUrl(null)
        toast.success('Imagem removida.')
      }
    })
  }

  const display = preview ?? imageUrl

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
        <div className="relative rounded-xl overflow-hidden h-32">
          <Image src={display} alt="Imagem do popup" fill className="object-cover" unoptimized={!!preview} />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {isPending ? <Loader2 className="size-6 text-white animate-spin" /> : <Camera className="size-6 text-white" />}
          </div>
          {!isPending && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white"
              aria-label="Remover imagem"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl h-32 border-2 border-dashed border-white/15 hover:border-primary/40 transition-colors flex flex-col items-center justify-center gap-1.5 bg-white/[0.02]">
          {isPending ? (
            <Loader2 className="size-6 text-primary animate-spin" />
          ) : (
            <>
              <ImagePlus className="size-6 text-white/25" />
              <p className="text-xs text-white/40">Adicionar imagem (opcional)</p>
              <p className="text-[11px] text-white/20">JPG, PNG ou WebP · máx. 1 MB</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
