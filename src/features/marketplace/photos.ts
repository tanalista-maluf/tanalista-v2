import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

// Fotos de anúncio do marketplace: até 5 por anúncio, 4MB cada, no bucket
// público listing-photos (migration 20261018000001).

export const MAX_LISTING_PHOTOS = 5
export const MAX_LISTING_PHOTO_BYTES = 4 * 1024 * 1024

const BUCKET = 'listing-photos'
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

// Link de envio assinado para uma foto: o app grava direto no Storage (a foto
// não passa pela Vercel, que limita o corpo a 4,5MB). O bucket recusa arquivo
// acima de 4MB ou de outro tipo, mesmo que o tamanho informado aqui minta.
export async function createListingPhotoUpload(
  userId: string,
  input: { mimeType: string; size: number }
): Promise<{ error: string } | { path: string; token: string; url: string }> {
  if (!(input.size > 0)) return { error: 'Nenhum arquivo selecionado.' }
  if (input.size > MAX_LISTING_PHOTO_BYTES) return { error: 'Cada foto pode ter no máximo 4MB.' }
  const ext = TYPES[input.mimeType]
  if (!ext) return { error: 'Formato inválido. Use JPG, PNG ou WebP.' }

  const storage = createAdminClient().storage.from(BUCKET)
  const path = `${userId}/${randomUUID()}.${ext}`
  const { data, error } = await storage.createSignedUploadUrl(path)
  if (error || !data) {
    console.error('[MARKETPLACE] signed upload error:', error)
    return { error: 'Erro ao preparar o envio da foto.' }
  }
  return { path, token: data.token, url: storage.getPublicUrl(path).data.publicUrl }
}

// Só aceita no anúncio fotos enviadas por aqui, pela própria pessoa
export function ownListingPhotos(userId: string, urls: string[] | undefined): string[] {
  const prefix = createAdminClient().storage.from(BUCKET).getPublicUrl(`${userId}/`).data.publicUrl
  return (urls ?? []).filter((url) => url.startsWith(prefix)).slice(0, MAX_LISTING_PHOTOS)
}
