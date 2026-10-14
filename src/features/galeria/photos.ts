import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'

// Fotos de evento, sem nada de transporte: usado pelas server actions do site
// (que recebem a foto já enviada ao Cloudinary pelo navegador) e pela API do
// app (que envia a foto ao Cloudinary pelo servidor).

const MAX_EVENT_STORAGE = 250 * 1024 * 1024 // 250MB por evento
const MAX_FILE_SIZE = 10 * 1024 * 1024       // 10MB por arquivo

// Deleta asset no Cloudinary usando assinatura HMAC
export async function cloudinaryDestroy(publicId: string) {
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

export type PhotoUpload = { publicId: string; secureUrl: string; fileSize: number }

// Registra uma foto que já está no Cloudinary. Se a pessoa não pode enviar ou
// o evento estourou o limite, a foto é apagada de lá para não ficar órfã.
export async function saveEventPhoto(
  supabase: SupabaseClient<Database>,
  userId: string,
  eventId: string,
  params: PhotoUpload
): Promise<{ error: string } | { success: true }> {
  const { data: event } = await supabase
    .from('events')
    .select('organizer_id, status')
    .eq('id', eventId)
    .single()

  if (!event) return { error: 'Evento não encontrado.' }

  const isOrganizer = event.organizer_id === userId
  if (!isOrganizer) {
    const { data: participation } = await supabase
      .from('participations')
      .select('status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
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
    user_id: userId,
    storage_path: params.secureUrl,
    storage_key: params.publicId,
    file_size: params.fileSize,
  })

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}

// O envio pelo app depende das credenciais do Cloudinary no servidor
export function isPhotoUploadEnabled() {
  return !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && !!process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
}

// Envia a imagem ao Cloudinary com o mesmo preset que o navegador usa no site
export async function uploadToCloudinary(file: File, eventId: string): Promise<PhotoUpload | null> {
  if (!isPhotoUploadEnabled() || file.size > MAX_FILE_SIZE) return null

  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!)
  form.append('folder', `tanalista/eventos/${eventId}`)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: form }
  ).catch(() => null)

  if (!response?.ok) return null
  const data = await response.json()
  return { publicId: data.public_id, secureUrl: data.secure_url, fileSize: data.bytes ?? file.size }
}
