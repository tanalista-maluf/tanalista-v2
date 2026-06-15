'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateProfileAction } from '@/features/perfil/actions'
import { toast } from 'sonner'

const schema = z.object({
  full_name: z.string().min(2, 'Nome muito curto.'),
  phone: z.string().optional(),
  city: z.string().min(2, 'Cidade obrigatória.'),
  bio: z.string().max(500).optional(),
})

type FormData = z.infer<typeof schema>

interface ProfileFormProps {
  profile: { full_name: string; phone: string | null; city: string | null; bio: string | null }
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [saved, setSaved] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: profile.full_name ?? '',
      phone: profile.phone ?? '',
      city: profile.city ?? '',
      bio: profile.bio ?? '',
    },
  })

  async function onSubmit(data: FormData) {
    const result = await updateProfileAction(data)
    if (result.error) {
      toast.error(result.error)
    } else {
      setSaved(true)
      toast.success('Perfil atualizado!')
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Nome completo</Label>
        <Input {...register('full_name')} />
        {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Cidade</Label>
        <Input {...register('city')} placeholder="Ex: São Paulo, SP" />
        {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Telefone <span className="text-white/50 text-xs">(opcional)</span></Label>
        <Input {...register('phone')} placeholder="(11) 99999-9999" />
      </div>

      <div className="space-y-1.5">
        <Label>Bio <span className="text-white/50 text-xs">(opcional)</span></Label>
        <Textarea {...register('bio')} placeholder="Conte um pouco sobre você..." rows={3} />
        {errors.bio && <p className="text-xs text-destructive">{errors.bio.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar alterações'}
      </Button>
    </form>
  )
}
