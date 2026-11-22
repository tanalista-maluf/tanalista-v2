import { createAdminClient } from '@/lib/supabase/admin'
import { onboardingStep1Schema, onboardingStep2Schema } from './schemas'

// Salva username, cidade e WhatsApp de uma vez, para o app mobile (etapa 1 do
// onboarding ali). No site o mesmo acontece em duas etapas, pelas actions de
// actions.ts; as regras de formato são as mesmas (schemas.ts). Não marca
// onboarding_completed — isso só acontece em completeOnboardingAction, depois
// das etapas de interesses e grupos sugeridos (iguais nas duas plataformas).

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
    .update(parsed.data)
    .eq('id', userId)

  if (error) {
    // Outra pessoa pegou o mesmo username entre a checagem e a gravação
    if (error.code === '23505') return { error: 'Este @username já está em uso.', field: 'username' }
    console.error('[ONBOARDING]', JSON.stringify(error))
    return { error: 'Erro ao salvar. Tente novamente.' }
  }

  return { success: true }
}
