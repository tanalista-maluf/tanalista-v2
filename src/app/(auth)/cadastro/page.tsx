'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { registerSchema, type RegisterSchema } from '@/features/auth/schemas'
import { registerAction } from '@/features/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { GoogleAuthButton } from '@/features/auth/components/GoogleAuthButton'

export default function CadastroPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterSchema>({ resolver: zodResolver(registerSchema) })

  async function onSubmit(data: RegisterSchema) {
    setServerError(null)
    const result = await registerAction(data)
    if (result?.error) {
      setServerError(result.error)
    } else if (result?.success) {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-10 pb-8 text-center space-y-4">
          <CheckCircle className="size-12 text-primary mx-auto" />
          <h2 className="text-xl font-bold">Verifique seu e-mail</h2>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Enviamos um link de confirmação. Clique nele para ativar sua conta e começar a usar o TáNaLista.
          </p>
          <p className="text-xs text-muted-foreground">
            Não recebeu?{' '}
            <button
              onClick={() => setSuccess(false)}
              className="text-primary hover:underline"
            >
              Tentar novamente
            </button>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar sua conta</CardTitle>
        <CardDescription>É grátis e leva menos de 1 minuto.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <Alert className="text-sm text-destructive border-destructive/30 bg-destructive/5">
              {serverError}
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nome completo</Label>
            <Input
              id="full_name"
              placeholder="João da Silva"
              autoComplete="name"
              aria-invalid={!!errors.full_name}
              {...register('full_name')}
            />
            {errors.full_name && (
              <p className="text-xs text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register('password')}
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
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm_password">Confirmar senha</Label>
            <Input
              id="confirm_password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              aria-invalid={!!errors.confirm_password}
              {...register('confirm_password')}
            />
            {errors.confirm_password && (
              <p className="text-xs text-destructive">{errors.confirm_password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Criar conta
          </Button>

          <div className="relative flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          <GoogleAuthButton label="Criar conta com Google" />

          <p className="text-xs text-center text-muted-foreground">
            Ao criar uma conta você concorda com os{' '}
            <Link href="/termos" className="text-primary hover:underline">Termos de Uso</Link>
            {' '}e a{' '}
            <Link href="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>.
          </p>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Já tem conta?&nbsp;
        <Link href="/login" className="text-primary hover:underline font-medium">
          Entrar
        </Link>
      </CardFooter>
    </Card>
  )
}
