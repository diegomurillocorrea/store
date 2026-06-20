'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { PRODUCT_IMAGE_BUCKET } from '@/lib/utils/product-image'

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

export async function uploadProductImageClient(
  organizationId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { url: null, error: 'La imagen debe ser JPG, PNG, WebP o GIF.' }
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { url: null, error: 'La imagen no puede superar 5 MB.' }
  }

  const supabase = createSupabaseBrowserClient()
  const extension = getExtensionFromMime(file.type)
  const objectPath = `${organizationId}/uploads/${crypto.randomUUID()}.${extension}`

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

export async function deleteProductImageClient(
  publicUrl: string | null | undefined
): Promise<void> {
  if (!publicUrl) return

  const marker = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return

  const objectPath = decodeURIComponent(publicUrl.slice(idx + marker.length))
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([objectPath])

  if (error) {
    console.error('deleteProductImageClient', error)
  }
}
