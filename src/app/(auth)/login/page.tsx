'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
// useRouter removido — redirect gerenciado pelo Server Action
import { loginSchema, type LoginSchema } from '@/features/auth/schemas'
import { loginAction } from '@/features/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(
    errorParam === 'link_invalido' ? 'Link inválido ou expirado.' : null
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginSchema) {
    setServerError(null)
    const result = await loginAction(data)
    if (result?.error) setServerError(result.error)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar na sua conta</CardTitle>
        <CardDescription>Bem-vindo de volta!</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <Alert className="text-sm text-destructive border-destructive/30 bg-destructive/5">
              {serverError}
            </Alert>
          )}

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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Link
                href="/recuperar-senha"
                className="text-xs text-primary hover:underline"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
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

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Entrar
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Não tem conta?&nbsp;
        <Link href="/cadastro" className="text-primary hover:underline font-medium">
          Criar conta grátis
        </Link>
      </CardFooter>
    </Card>
  )
}
