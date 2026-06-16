'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

const MAX_EVENT_STORAGE = 250 * 1024 * 1024 // 250MB por evento
const MAX_FILE_SIZE = 10 * 1024 * 1024       // 10MB por arquivo

// Deleta asset no Cloudinary usando assinatura HMAC
async function cloudinaryDestroy(publicId: string) {
  const timestamp = Math.floor(Date.now() / 1000)
  const str = `public_id=${publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`
  const signature = crypto.createHash('sha1').update(str).digest('hex')

  await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/destroy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      public_id: publicId,
      api_key: process.env.CLOUDINARY_API_KEY,
      timestamp,
      signature,
    }),
  })
}

export async function saveEventPhotoAction(eventId: string, params: {
  publicId: string
  secureUrl: string
  fileSize: number
}) {
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
      // Foto já foi enviada ao Cloudinary — destruir para não ficar órfã
      await cloudinaryDestroy(params.publicId)
      return { error: 'Apenas participantes confirmados podem enviar fotos.' }
    }
  }

  const admin = createAdminClient()

  // Verificar limite de 250MB por evento
  const { data: sizeRows } = await admin
    .from('event_photos')
    .select('file_size')
    .eq('event_id', eventId)

  const usedBytes = (sizeRows ?? []).reduce((sum, r) => sum + (r.file_size ?? 0), 0)
  if (usedBytes + params.fileSize > MAX_EVENT_STORAGE) {
    await cloudinaryDestroy(params.publicId)
    const usedMB = (usedBytes / 1024 / 1024).toFixed(0)
    return { error: `Limite de 250 MB por evento atingido (${usedMB} MB usados).` }
  }

  await admin.from('event_photos').insert({
    event_id: eventId,
    user_id: user.id,
    storage_path: params.secureUrl,
    storage_key: params.publicId,
    file_size: params.fileSize,
  })

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
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
