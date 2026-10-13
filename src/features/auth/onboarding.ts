import { createAdminClient } from '@/lib/supabase/admin'
import { onboardingStep1Schema, onboardingStep2Schema } from './schemas'

// Conclui o onboarding de uma vez (username, cidade e WhatsApp), para o app
// mobile. No site o mesmo acontece em etapas, pelas actions de actions.ts; as
// regras de formato são as mesmas (schemas.ts).

const onboardingSchema = onboardingStep1Schema.merge(onboardingStep2Schema)

export type OnboardingResult = { error: string; field?: 'username' | 'city' | 'phone' } | { success: true }

export async function completeOnboarding(userId: string, input: unknown): Promise<OnboardingResult> {
  const parsed = onboardingSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { error: issue.message, field: issue.path[0] as 'username' | 'city' | 'phone' }
  }

  const admin = createAdminClient()

  const { data: taken } = await admin
    .from('profiles')
    .select('id')
    .eq('username', parsed.data.username)
    .neq('id', userId)
    .maybeSingle()

  if (taken) return { error: 'Este @username já está em uso.', field: 'username' }

  const { error } = await admin
    .from('profiles')
    .update({ ...parsed.data, onboarding_completed: true })
    .eq('id', userId)

  if (error) {
    // Outra pessoa pegou o mesmo username entre a checagem e a gravação
    if (error.code === '23505') return { error: 'Este @username já está em uso.', field: 'username' }
    console.error('[ONBOARDING]', JSON.stringify(error))
    return { error: 'Erro ao salvar. Tente novamente.' }
  }

  return { success: true }
}
