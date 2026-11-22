import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'

// Fotos de evento, sem nada de transporte: usado pelas server actions do site
// e pela API do app. As fotos novas vão para o bucket event-photos do Supabase
// Storage (migration 20261018000002): o servidor confere quem pode enviar e
// devolve um link assinado, a foto sobe direto do navegador ou do app (sem
// passar pela Vercel) e depois o servidor registra. Fotos antigas podem estar
// no Cloudinary; storage_key diz onde cada uma está.

const MAX_EVENT_STORAGE = 250 * 1024 * 1024 // 250MB por evento
export const MAX_EVENT_PHOTO_BYTES = 4 * 1024 * 1024 // 4MB por foto (Storage)

const BUCKET = 'event-photos'
// storage_key de foto no Storage; sem o prefixo, é um public_id do Cloudinary
const STORAGE_KEY_PREFIX = 'storage:'
const PHOTO_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

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

// Com o Storage o envio está sempre disponível (antes dependia do Cloudinary)
export function isPhotoUploadEnabled() {
  return true
}

// ── Supabase Storage ─────────────────────────────────────────────────────────

type UserClient = SupabaseClient<Database>

// Quem pode enviar foto (organizador ou inscrito confirmado) e quanto o evento
// já usa do limite de 250MB
async function photoUploadAllowance(supabase: UserClient, userId: string, eventId: string) {
  const { data: event } = await supabase.from('events').select('organizer_id').eq('id', eventId).maybeSingle()
  if (!event) return { error: 'Evento não encontrado.' }

  if (event.organizer_id !== userId) {
    const { data: participation } = await supabase
      .from('participations')
      .select('status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle()
    if (participation?.status !== 'CONFIRMED') return { error: 'Apenas participantes confirmados podem enviar fotos.' }
  }

  const { data: sizeRows } = await createAdminClient().from('event_photos').select('file_size').eq('event_id', eventId)
  const usedBytes = (sizeRows ?? []).reduce((sum, r) => sum + (r.file_size ?? 0), 0)
  return { usedBytes }
}

function storageLimitError(usedBytes: number) {
  return `Limite de 250 MB por evento atingido (${(usedBytes / 1024 / 1024).toFixed(0)} MB usados).`
}

// 1. Autoriza o envio e devolve o link assinado (caminho + token)
export async function createEventPhotoUpload(
  supabase: UserClient,
  userId: string,
  eventId: string,
  input: { mimeType: string; size: number }
): Promise<{ error: string } | { path: string; token: string }> {
  if (!(input.size > 0)) return { error: 'Nenhum arquivo selecionado.' }
  if (input.size > MAX_EVENT_PHOTO_BYTES) return { error: 'Cada foto pode ter no máximo 4MB.' }
  const ext = PHOTO_TYPES[input.mimeType]
  if (!ext) return { error: 'Formato inválido. Use JPG, PNG ou WebP.' }

  const allowance = await photoUploadAllowance(supabase, userId, eventId)
  if ('error' in allowance) return { error: allowance.error! }
  if (allowance.usedBytes + input.size > MAX_EVENT_STORAGE) return { error: storageLimitError(allowance.usedBytes) }

  const path = `${eventId}/${userId}/${crypto.randomUUID()}.${ext}`
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(path)
  if (error || !data) {
    console.error('[FOTOS] signed upload error:', error)
    return { error: 'Erro ao preparar o envio da foto.' }
  }
  return { path, token: data.token }
}

// 2. Depois do envio, registra a foto com o tamanho real do arquivo
export async function confirmEventPhotoUpload(
  supabase: UserClient,
  userId: string,
  eventId: string,
  path: string
): Promise<{ error: string } | { success: true; url: string; size: number }> {
  const folder = `${eventId}/${userId}`
  const name = path.startsWith(`${folder}/`) ? path.slice(folder.length + 1) : ''
  if (!name || name.includes('/')) return { error: 'Foto inválida.' }

  const storage = createAdminClient().storage.from(BUCKET)
  const { data: files } = await storage.list(folder, { search: name, limit: 1 })
  const file = files?.find((item) => item.name === name)
  if (!file) return { error: 'A foto não chegou. Tente enviar de novo.' }
  const size = Number((file.metadata as { size?: number } | null)?.size ?? 0)

  const allowance = await photoUploadAllowance(supabase, userId, eventId)
  if ('error' in allowance || allowance.usedBytes + size > MAX_EVENT_STORAGE) {
    await storage.remove([path])
    return { error: 'error' in allowance ? allowance.error! : storageLimitError(allowance.usedBytes) }
  }

  const url = storage.getPublicUrl(path).data.publicUrl
  const { error } = await createAdminClient().from('event_photos').insert({
    event_id: eventId,
    user_id: userId,
    storage_path: url,
    storage_key: `${STORAGE_KEY_PREFIX}${path}`,
    file_size: size,
  })
  if (error) {
    await storage.remove([path])
    return { error: 'Erro ao salvar a foto.' }
  }

  revalidatePath(`/eventos/${eventId}`)
  return { success: true, url, size }
}

// Apaga os arquivos de fotos removidas, estejam no Storage ou no Cloudinary
export async function removeEventPhotoFiles(storageKeys: (string | null)[]) {
  const keys = storageKeys.filter((key): key is string => !!key)
  const paths = keys.filter((key) => key.startsWith(STORAGE_KEY_PREFIX)).map((key) => key.slice(STORAGE_KEY_PREFIX.length))
  const cloudinary = keys.filter((key) => !key.startsWith(STORAGE_KEY_PREFIX))

  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await createAdminClient().storage.from(BUCKET).remove(paths.slice(i, i + 100))
    if (error) console.error('[FOTOS] storage remove error:', error)
  }
  if (cloudinary.length && process.env.CLOUDINARY_API_SECRET) {
    await Promise.all(cloudinary.map((key) => cloudinaryDestroy(key).catch(() => undefined)))
  }
}
