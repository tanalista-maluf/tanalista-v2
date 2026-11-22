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
import { Eye, EyeOff } from 'lucide-react'

const emailSchema = z.object({ email: z.string().email('E-mail inválido.') })
const passwordSchema = z.object({
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres.')
    .regex(/[A-Z]/, 'Deve conter ao menos uma letra maiúscula.')
    .regex(/[0-9]/, 'Deve conter ao menos um número.'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'As senhas não coincidem.', path: ['confirm'] })

export function SecurityForm({ currentEmail }: { currentEmail: string }) {
  const [emailSaved, setEmailSaved] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const emailForm = useForm({ resolver: zodResolver(emailSchema), defaultValues: { email: currentEmail } })
  const pwForm = useForm({ resolver: zodResolver(passwordSchema), defaultValues: { password: '', confirm: '' } })

  async function onEmailSubmit(data: { email: string }) {
    const result = await updateEmailAction(data)
    if (result.error) toast.error(result.error)
    else { setEmailSaved(true); toast.success('Confira seu e-mail para confirmar a troca.') }
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
          <div className="relative">
            <Input
              {...pwForm.register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 8 caracteres"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {pwForm.formState.errors.password ? (
            <p className="text-xs text-destructive">{pwForm.formState.errors.password.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Ao menos 8 caracteres, uma maiúscula e um número.</p>
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
