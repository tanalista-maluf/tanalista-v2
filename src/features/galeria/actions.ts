'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { confirmEventPhotoUpload, createEventPhotoUpload, removeEventPhotoFiles } from './photos'

// Envio pelo navegador: link assinado do Storage e, depois do envio, o registro
export async function createEventPhotoUploadAction(eventId: string, input: { mimeType: string; size: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }
  return createEventPhotoUpload(supabase, user.id, eventId, input)
}

export async function confirmEventPhotoUploadAction(eventId: string, path: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }
  return confirmEventPhotoUpload(supabase, user.id, eventId, path)
}

export async function deleteEventPhotoAction(photoId: string, eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient()
  const { data: photo } = await admin
    .from('event_photos')
    .select('user_id, storage_key')
    .eq('id', photoId)
    .single()

  if (!photo) return { error: 'Foto não encontrada.' }

  const { data: event } = await admin.from('events').select('organizer_id').eq('id', eventId).single()
  const canDelete = photo.user_id === user.id || event?.organizer_id === user.id
  if (!canDelete) return { error: 'Sem permissão.' }

  // Remover o arquivo (Storage ou, nas fotos antigas, Cloudinary)
  await removeEventPhotoFiles([photo.storage_key])

  await admin.from('event_photos').delete().eq('id', photoId)

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}
