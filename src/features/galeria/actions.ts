'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cloudinaryDestroy, saveEventPhoto, type PhotoUpload } from './photos'

export async function saveEventPhotoAction(eventId: string, params: PhotoUpload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  return saveEventPhoto(supabase, user.id, eventId, params)
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

  // Remover do Cloudinary
  if (photo.storage_key) {
    await cloudinaryDestroy(photo.storage_key)
  }

  await admin.from('event_photos').delete().eq('id', photoId)

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}
