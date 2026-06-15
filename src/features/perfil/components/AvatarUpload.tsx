'use client'

import { useRef, useState, useTransition } from 'react'
import { uploadAvatarAction } from '../actions'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  name: string
  currentAvatarUrl: string | null
}

export function AvatarUpload({ name, currentAvatarUrl }: Props) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl)
  const [preview, setPreview] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Show local preview immediately
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    const formData = new FormData()
    formData.append('avatar', file)

    startTransition(async () => {
      const res = await uploadAvatarAction(formData)
      if (res.error) {
        toast.error(res.error)
        setPreview(null)
      } else {
        setAvatarUrl(res.avatarUrl ?? null)
        setPreview(null)
        toast.success('Foto atualizada!')
      }
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="relative group"
        aria-label="Alterar foto de perfil"
      >
        <div className="ring-2 ring-primary/40 rounded-full">
          {isPending ? (
            <div className="size-16 rounded-full bg-white/10 flex items-center justify-center">
              <Loader2 className="size-6 text-primary animate-spin" />
            </div>
          ) : (
            <UserAvatar
              name={name}
              avatarUrl={preview ?? avatarUrl}
              size="lg"
            />
          )}
        </div>

        {/* Camera overlay on hover */}
        {!isPending && (
          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="size-5 text-white" />
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="text-xs text-primary hover:underline disabled:opacity-40"
      >
        {isPending ? 'Enviando...' : 'Alterar foto'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
