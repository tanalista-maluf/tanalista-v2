'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_EVENT_STORAGE = 100 * 1024 * 1024 // 100MB por evento
const MAX_FILE_SIZE = 10 * 1024 * 1024       // 10MB por arquivo

export async function uploadEventPhotoAction(eventId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

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
  if (file.size > MAX_FILE_SIZE) return { error: 'Foto deve ter no máximo 10 MB.' }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return { error: 'Formato inválido. Use JPEG, PNG ou WebP.' }
  }

  const admin = createAdminClient()

  // Verificar limite de 100MB por evento
  const { data: sizeRow } = await admin
    .from('event_photos')
    .select('file_size')
    .eq('event_id', eventId)

  const usedBytes = (sizeRow ?? []).reduce((sum, r) => sum + (r.file_size ?? 0), 0)
  if (usedBytes + file.size > MAX_EVENT_STORAGE) {
    const usedMB = (usedBytes / 1024 / 1024).toFixed(1)
    return { error: `Limite de 100 MB por evento atingido (${usedMB} MB usados). Exclua fotos para liberar espaço.` }
  }

  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
  const storageKey = `${eventId}/${user.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await admin.storage
    .from('event-photos')
    .upload(storageKey, file, { contentType: file.type })

  if (uploadError) return { error: 'Erro ao fazer upload.' }

  const { data: { publicUrl } } = admin.storage.from('event-photos').getPublicUrl(storageKey)

  await admin.from('event_photos').insert({
    event_id: eventId,
    user_id: user.id,
    storage_path: publicUrl,
    storage_key: storageKey,
    file_size: file.size,
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
    .select('user_id, storage_path, storage_key')
    .eq('id', photoId)
    .single()

  if (!photo) return { error: 'Foto não encontrada.' }

  const { data: event } = await admin.from('events').select('organizer_id').eq('id', eventId).single()
  const canDelete = photo.user_id === user.id || event?.organizer_id === user.id
  if (!canDelete) return { error: 'Sem permissão.' }

  // Remover do storage se tiver a chave
  if (photo.storage_key) {
    await admin.storage.from('event-photos').remove([photo.storage_key])
  }

  await admin.from('event_photos').delete().eq('id', photoId)

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}

export async function getEventStorageUsageAction(eventId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('event_photos')
    .select('file_size')
    .eq('event_id', eventId)

  const usedBytes = (data ?? []).reduce((sum, r) => sum + (r.file_size ?? 0), 0)
  return {
    usedBytes,
    usedMB: usedBytes / 1024 / 1024,
    limitMB: 100,
    percent: Math.min(100, (usedBytes / MAX_EVENT_STORAGE) * 100),
  }
}
