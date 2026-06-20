import type { SupabaseClient } from '@supabase/supabase-js'

export const PRODUCT_IMAGE_BUCKET = 'product-images'

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function getExtensionFromMime(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    default:
      return 'bin'
  }
}

export function parseProductImageFile(formData: FormData): { error: string } | File | null {
  const image = formData.get('image')
  if (image == null || !(image instanceof File) || image.size === 0) {
    return null
  }

  if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
    return { error: 'La imagen debe ser JPG, PNG, WebP o GIF.' }
  }

  if (image.size > MAX_IMAGE_BYTES) {
    return { error: 'La imagen no puede superar 5 MB.' }
  }

  return image
}

export function shouldRemoveProductImage(formData: FormData): boolean {
  return String(formData.get('removeImage') ?? '') === 'true'
}

export function getProductImageStoragePath(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(publicUrl.slice(idx + marker.length))
}

export function isValidProductImageUrl(
  publicUrl: string,
  organizationId: string
): boolean {
  const objectPath = getProductImageStoragePath(publicUrl)
  if (!objectPath) return false
  return objectPath.startsWith(`${organizationId}/`)
}

export function parseImageUrlFromForm(formData: FormData): string | null {
  const raw = String(formData.get('imageUrl') ?? '').trim()
  return raw.length > 0 ? raw : null
}

export async function uploadProductImage(
  supabase: SupabaseClient,
  organizationId: string,
  productId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const extension = getExtensionFromMime(file.type)
  const objectPath = `${organizationId}/${productId}/${crypto.randomUUID()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(objectPath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return { url: null, error: uploadError.message || 'No se pudo subir la imagen.' }
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(objectPath)
  return { url: data.publicUrl, error: null }
}

export async function deleteProductImageByUrl(
  supabase: SupabaseClient,
  publicUrl: string | null | undefined
): Promise<void> {
  if (!publicUrl) return

  const objectPath = getProductImageStoragePath(publicUrl)
  if (!objectPath) return

  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([objectPath])
  if (error) {
    console.error('deleteProductImageByUrl', error)
  }
}
