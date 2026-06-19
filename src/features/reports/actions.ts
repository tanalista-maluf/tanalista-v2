'use server'

import { createClient } from '@/lib/supabase/server'

export async function submitReportAction(
  targetType: 'EVENT' | 'GROUP',
  targetId: string,
  reason: string,
  description: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { error } = await supabase
    .from('reports')
    .upsert(
      { reporter_id: user.id, target_type: targetType, target_id: targetId, reason, description: description.trim() || null },
      { onConflict: 'reporter_id,target_type,target_id' }
    )

  if (error) {
    if (error.code === '23505') return { error: 'Você já enviou uma denúncia sobre este conteúdo.' }
    return { error: 'Erro ao enviar denúncia.' }
  }

  return {}
}
