'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { recoverSchema, type RecoverSchema } from '@/features/auth/schemas'
import { recoverAction } from '@/features/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { CheckCircle, Loader2 } from 'lucide-react'

export default function RecuperarSenhaPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecoverSchema>({ resolver: zodResolver(recoverSchema) })

  async function onSubmit(data: RecoverSchema) {
    setServerError(null)
    const result = await recoverAction(data)
    if (result?.error) {
      setServerError(result.error)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-10 pb-8 text-center space-y-4">
          <CheckCircle className="size-12 text-primary mx-auto" />
          <h2 className="text-xl font-bold">E-mail enviado!</h2>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Se esse e-mail estiver cadastrado, você receberá um link para redefinir sua senha.
          </p>
          <Link href="/login" className="text-sm text-primary hover:underline block">
            Voltar para o login
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar senha</CardTitle>
        <CardDescription>
          Informe seu e-mail e enviaremos um link para criar uma nova senha.
        </CardDescription>
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

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Enviar link de recuperação
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          Voltar para o login
        </Link>
      </CardFooter>
    </Card>
  )
}
