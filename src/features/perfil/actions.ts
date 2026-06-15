'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome muito curto.').max(100),
  phone: z.string().max(20).optional(),
  city: z.string().min(2, 'Cidade obrigatória.').max(100),
  bio: z.string().max(500).optional(),
})

const emailSchema = z.object({
  email: z.string().email('E-mail inválido.'),
})

const passwordSchema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres.'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'As senhas não coincidem.', path: ['confirm'] })

export async function updateProfileAction(input: z.infer<typeof profileSchema>) {
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update(parsed.data)
    .eq('id', user.id)

  if (error) return { error: 'Erro ao salvar perfil.' }

  revalidatePath('/perfil')
  return { success: true }
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

  const file = formData.get('avatar') as File | null
  if (!file || file.size === 0) return { error: 'Nenhum arquivo selecionado.' }
  if (file.size > 2 * 1024 * 1024) return { error: 'Imagem deve ter no máximo 2MB.' }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return { error: 'Formato inválido. Use JPG, PNG ou WebP.' }
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${user.id}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: 'Erro ao enviar imagem.' }

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

  // Add cache-busting so Next.js Image shows the new photo
  const avatarUrl = `${publicUrl}?t=${Date.now()}`

  const admin = createAdminClient()
  await admin.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id)

  revalidatePath('/perfil')
  return { avatarUrl }
}

export async function updatePasswordAction(input: z.infer<typeof passwordSchema>) {
  const parsed = passwordSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) return { error: 'Erro ao atualizar senha.' }

  return { success: true }
}
