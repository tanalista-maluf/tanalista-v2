'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { LoginSchema, RegisterSchema, RecoverSchema, OnboardingStep1, OnboardingStep2 } from './schemas'

export async function loginAction(data: LoginSchema) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) {
    return { error: 'E-mail ou senha incorretos.' }
  }

  redirect('/home')
}

export async function registerAction(data: RegisterSchema) {
  const supabase = await createClient()

  const { data: signUpData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { full_name: data.full_name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'Este e-mail já está cadastrado.' }
    }
    return { error: 'Erro ao criar conta. Tente novamente.' }
  }

  // Em desenvolvimento local, confirma o e-mail automaticamente
  if (process.env.NODE_ENV !== 'production' && signUpData.user) {
    const admin = createAdminClient()
    await admin.auth.admin.updateUserById(signUpData.user.id, { email_confirm: true })
  }

  return { success: true }
}

export async function recoverAction(data: RecoverSchema) {
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?type=recovery`,
  })

  if (error) {
    return { error: 'Erro ao enviar e-mail. Tente novamente.' }
  }

  return { success: true }
}

export async function googleOAuthAction(mode: 'login' | 'cadastro' = 'login') {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error || !data.url) {
    return { error: 'Não foi possível conectar ao Google. Tente novamente.' }
  }

  redirect(data.url)
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function onboardingStep1Action(data: OnboardingStep1) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }

  // Verificar se username já existe
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', data.username)
    .neq('id', user.id)
    .maybeSingle()

  if (existing) return { error: 'Este @username já está em uso.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ username: data.username })
    .eq('id', user.id)

  if (error) {
    console.error('[ONBOARDING STEP1]', JSON.stringify(error))
    return { error: 'Erro ao salvar. Tente novamente.' }
  }

  return { success: true }
}

export async function onboardingStep2Action(data: OnboardingStep2) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({
      city: data.city,
      phone: data.phone || null,
    })
    .eq('id', user.id)

  if (error) return { error: 'Erro ao salvar. Tente novamente.' }

  return { success: true }
}

export async function getSuggestedGroupsAction(city: string, categories: string[]) {
  const supabase = await createClient()

  let query = supabase
    .from('groups')
    .select('id, name, category, city, member_count, description')
    .eq('visibility', 'PUBLIC')
    .order('member_count', { ascending: false })
    .limit(6)

  if (city) query = query.ilike('city', `%${city}%`)
  if (categories.length > 0) query = query.in('category', categories)

  const { data } = await query

  // Se não encontrou com categoria, busca só pela cidade
  if (!data || data.length === 0) {
    const { data: fallback } = await supabase
      .from('groups')
      .select('id, name, category, city, member_count, description')
      .eq('visibility', 'PUBLIC')
      .ilike('city', `%${city}%`)
      .order('member_count', { ascending: false })
      .limit(6)
    return fallback ?? []
  }

  return data
}

export async function joinGroupOnboardingAction(groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  await admin.from('group_members').upsert(
    { group_id: groupId, user_id: user.id, role: 'MEMBER' },
    { onConflict: 'group_id,user_id' }
  )
  return { success: true }
}

export async function completeOnboardingAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  await admin
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', user.id)

  redirect('/home')
}
