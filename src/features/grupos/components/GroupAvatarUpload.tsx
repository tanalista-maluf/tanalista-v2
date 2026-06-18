'use client'

import { useRef, useState, useTransition } from 'react'
import { uploadGroupAvatarAction } from '../actions'
import { Camera, Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface Props {
  groupId: string
  groupName: string
  currentAvatarUrl: string | null
}

export function GroupAvatarUpload({ groupId, groupName, currentAvatarUrl }: Props) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl)
  const [preview, setPreview] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    const formData = new FormData()
    formData.append('avatar', file)
    formData.append('groupId', groupId)

    startTransition(async () => {
      const res = await uploadGroupAvatarAction(formData)
      if (res.error) {
        toast.error(res.error)
        setPreview(null)
      } else {
        setAvatarUrl(res.avatarUrl ?? null)
        setPreview(null)
        toast.success('Logo do grupo atualizada!')
      }
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  const displayUrl = preview ?? avatarUrl

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="relative group"
        aria-label="Alterar logo do grupo"
      >
        <div className="size-20 rounded-2xl ring-2 ring-primary/40 overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center">
          {isPending ? (
            <Loader2 className="size-7 text-primary animate-spin" />
          ) : displayUrl ? (
            <Image src={displayUrl} alt={groupName} fill className="object-cover" />
          ) : (
            <span className="text-3xl font-bold text-primary">
              {groupName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {!isPending && (
          <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="size-6 text-white" />
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="text-xs text-primary hover:underline disabled:opacity-40"
      >
        {isPending ? 'Enviando...' : 'Alterar logo'}
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
