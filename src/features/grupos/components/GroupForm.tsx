'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { groupSchema, type GroupSchema } from '../schemas'
import { createGroupAction, updateGroupAction } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

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
  const [serverError, setServerError] = useState<string | null>(null)

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

  async function onSubmit(data: GroupSchema) {
    setServerError(null)
    const result = groupId
      ? await updateGroupAction(groupId, data)
      : await createGroupAction(data)

    if (result?.error) {
      setServerError(result.error)
    } else if (!result?.error && onSuccess) {
      onSuccess()
    }
    // createGroupAction faz redirect, então não chegamos aqui no fluxo de criação
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <p className="text-sm text-destructive">{serverError}</p>
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
