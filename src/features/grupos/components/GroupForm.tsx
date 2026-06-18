'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { groupSchema, type GroupSchema } from '../schemas'
import { createGroupAction, updateGroupAction, uploadGroupAvatarAction } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Camera, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

const CATEGORIES = [
  'Esportes', 'Gastronomia', 'Viagens', 'Música', 'Cinema', 'Teatro',
  'Arte', 'Tecnologia', 'Negócios', 'Saúde', 'Educação', 'Outros',
]

interface GroupFormProps {
  groupId?: string
  defaultValues?: Partial<GroupSchema>
  onSuccess?: () => void
}

export function GroupForm({ groupId, defaultValues, onSuccess }: GroupFormProps) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isCreating = !groupId

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GroupSchema>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      visibility: 'PUBLIC',
      ...defaultValues,
    },
  })

  const visibility = watch('visibility')
  const category = watch('category')
  const nameValue = watch('name')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function onSubmit(data: GroupSchema) {
    setServerError(null)

    if (groupId) {
      const result = await updateGroupAction(groupId, data)
      if (result?.error) {
        setServerError(result.error)
      } else if (onSuccess) {
        onSuccess()
      }
      return
    }

    // Criação: cria o grupo, depois faz upload do avatar se houver
    const result = await createGroupAction(data)
    if (result.error) {
      setServerError(result.error)
      return
    }

    const { groupId: newGroupId, slug } = result

    if (pendingFile && newGroupId) {
      const formData = new FormData()
      formData.append('avatar', pendingFile)
      formData.append('groupId', newGroupId)
      startTransition(async () => {
        const uploadResult = await uploadGroupAvatarAction(formData)
        if (uploadResult.error) toast.error(`Logo não enviada: ${uploadResult.error}`)
      })
    }

    router.push(`/grupos/${slug}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <p className="text-sm text-destructive">{serverError}</p>
      )}

      {/* Avatar picker — apenas na criação */}
      {isCreating && (
        <div className="flex justify-center">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group"
              aria-label="Adicionar logo do grupo"
            >
              <div className="size-20 rounded-2xl ring-2 ring-primary/40 overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center">
                {preview ? (
                  <Image src={preview} alt="Preview" fill className="object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-primary">
                    {nameValue?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="size-6 text-white" />
              </div>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-primary hover:underline"
            >
              {preview ? 'Alterar logo' : 'Adicionar logo'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">Nome do grupo *</Label>
        <Input
          id="name"
          placeholder="Ex: Galera do Futevôlei"
          aria-invalid={!!errors.name}
          {...register('name')}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">
          Descrição <span className="text-white/50 text-xs">(opcional)</span>
        </Label>
        <Textarea
          id="description"
          placeholder="Conte um pouco sobre o grupo..."
          rows={3}
          aria-invalid={!!errors.description}
          {...register('description')}
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="city">Cidade *</Label>
          <Input
            id="city"
            placeholder="São Paulo"
            aria-invalid={!!errors.city}
            {...register('city')}
          />
          {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Select
            value={category || ''}
            onValueChange={(v) => setValue('category', v || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar..." />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Visibilidade *</Label>
        <div className="grid grid-cols-2 gap-3">
          {(['PUBLIC', 'PRIVATE'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setValue('visibility', v)}
              className={[
                'rounded-lg border p-3 text-left text-sm transition-colors',
                visibility === v
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-white/10 hover:border-primary/40',
              ].join(' ')}
            >
              <span className="font-medium block">
                {v === 'PUBLIC' ? '🌍 Público' : '🔒 Privado'}
              </span>
              <span className="text-xs text-white/50">
                {v === 'PUBLIC'
                  ? 'Qualquer pessoa pode entrar'
                  : 'Apenas por convite'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {groupId ? 'Salvar alterações' : 'Criar grupo'}
      </Button>
    </form>
  )
}
