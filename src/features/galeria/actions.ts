'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function uploadEventPhotoAction(eventId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  // Verificar que é participante confirmado ou organizador
  const { data: event } = await supabase
    .from('events')
    .select('organizer_id, status')
    .eq('id', eventId)
    .single()

  if (!event) return { error: 'Evento não encontrado.' }

  const isOrganizer = event.organizer_id === user.id

  if (!isOrganizer) {
    const { data: participation } = await supabase
      .from('participations')
      .select('status')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (participation?.status !== 'CONFIRMED') {
      return { error: 'Apenas participantes confirmados podem enviar fotos.' }
    }
  }

  const file = formData.get('photo') as File | null
  if (!file || file.size === 0) return { error: 'Nenhuma foto selecionada.' }
  if (file.size > 5 * 1024 * 1024) return { error: 'Foto deve ter no máximo 5 MB.' }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return { error: 'Formato inválido. Use JPEG, PNG ou WebP.' }
  }

  const ext = file.type.split('/')[1]
  const path = `${user.id}/${eventId}/${Date.now()}.${ext}`

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from('event-photos')
    .upload(path, file, { contentType: file.type })

  if (uploadError) return { error: 'Erro ao fazer upload.' }

  const { data: { publicUrl } } = admin.storage.from('event-photos').getPublicUrl(path)

  await admin.from('event_photos').insert({
    event_id: eventId,
    user_id: user.id,
    storage_path: publicUrl,
  })

  revalidatePath(`/eventos/${eventId}`)
  return { success: true, url: publicUrl }
}

export async function deleteEventPhotoAction(photoId: string, eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()
  const { data: photo } = await admin
    .from('event_photos')
    .select('user_id, storage_path')
    .eq('id', photoId)
    .single()

  // Verificar que é o dono da foto ou organizador do evento
  if (!photo) return { error: 'Foto não encontrada.' }

  const { data: event } = await admin.from('events').select('organizer_id').eq('id', eventId).single()
  const canDelete = photo.user_id === user.id || event?.organizer_id === user.id

  if (!canDelete) return { error: 'Sem permissão.' }

  await admin.from('event_photos').delete().eq('id', photoId)

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}
