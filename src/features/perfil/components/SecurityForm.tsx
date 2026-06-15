'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateEmailAction, updatePasswordAction } from '@/features/perfil/actions'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'

const emailSchema = z.object({ email: z.string().email('E-mail inválido.') })
const passwordSchema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres.'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'As senhas não coincidem.', path: ['confirm'] })

export function SecurityForm({ currentEmail }: { currentEmail: string }) {
  const [emailSaved, setEmailSaved] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)

  const emailForm = useForm({ resolver: zodResolver(emailSchema), defaultValues: { email: currentEmail } })
  const pwForm = useForm({ resolver: zodResolver(passwordSchema), defaultValues: { password: '', confirm: '' } })

  async function onEmailSubmit(data: { email: string }) {
    const result = await updateEmailAction(data)
    if (result.error) toast.error(result.error)
    else { setEmailSaved(true); toast.success('E-mail atualizado!') }
  }

  async function onPasswordSubmit(data: { password: string; confirm: string }) {
    const result = await updatePasswordAction(data)
    if (result.error) toast.error(result.error)
    else { setPwSaved(true); pwForm.reset(); toast.success('Senha atualizada!') }
  }

  return (
    <div className="space-y-6">
      {/* E-mail */}
      <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-3">
        <h3 className="text-sm font-semibold">E-mail</h3>
        <div className="space-y-1.5">
          <Label>Endereço de e-mail</Label>
          <Input {...emailForm.register('email')} type="email" />
          {emailForm.formState.errors.email && (
            <p className="text-xs text-destructive">{emailForm.formState.errors.email.message}</p>
          )}
        </div>
        <Button type="submit" size="sm" disabled={emailForm.formState.isSubmitting}>
          {emailSaved ? 'Salvo!' : 'Atualizar e-mail'}
        </Button>
      </form>

      <Separator />

      {/* Senha */}
      <form onSubmit={pwForm.handleSubmit(onPasswordSubmit)} className="space-y-3">
        <h3 className="text-sm font-semibold">Senha</h3>
        <div className="space-y-1.5">
          <Label>Nova senha</Label>
          <Input {...pwForm.register('password')} type="password" placeholder="Mínimo 8 caracteres" />
          {pwForm.formState.errors.password && (
            <p className="text-xs text-destructive">{pwForm.formState.errors.password.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Confirmar nova senha</Label>
          <Input {...pwForm.register('confirm')} type="password" />
          {pwForm.formState.errors.confirm && (
            <p className="text-xs text-destructive">{pwForm.formState.errors.confirm.message}</p>
          )}
        </div>
        <Button type="submit" size="sm" disabled={pwForm.formState.isSubmitting}>
          {pwSaved ? 'Salvo!' : 'Atualizar senha'}
        </Button>
      </form>
    </div>
  )
}
