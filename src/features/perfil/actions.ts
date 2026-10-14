'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { updateProfile, uploadAvatar, type ProfileInput } from './profile'

const emailSchema = z.object({
  email: z.string().email('E-mail inválido.'),
})

const passwordSchema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres.'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'As senhas não coincidem.', path: ['confirm'] })

export async function updateProfileAction(input: ProfileInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  return updateProfile(user.id, input)
}

export async function updateEmailAction(input: z.infer<typeof emailSchema>) {
  const parsed = emailSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ email: parsed.data.email })

  if (error) return { error: 'Erro ao atualizar e-mail.' }

  revalidatePath('/perfil')
  return { success: true }
}

export async function uploadAvatarAction(formData: FormData): Promise<{ error?: string; avatarUrl?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  return uploadAvatar(supabase, user.id, formData.get('avatar') as File | null)
}

export async function updatePasswordAction(input: z.infer<typeof passwordSchema>) {
  const parsed = passwordSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) return { error: 'Erro ao atualizar senha.' }

  return { success: true }
}
