'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  BRAND_LOGO_STORAGE_PREFIX,
  getExtensionFromLogoMime,
  validateBrandLogoUpload,
} from '@/lib/utils/brand-logo'
import { getProductImageStoragePath, PRODUCT_IMAGE_BUCKET } from '@/lib/utils/product-image'

export async function uploadBrandLogoClient(
  organizationId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const validated = validateBrandLogoUpload(file)

  if ('error' in validated) {
    return { url: null, error: validated.error }
  }

  const supabase = createSupabaseBrowserClient()
  const extension = getExtensionFromLogoMime(validated.type)
  const objectPath = `${organizationId}/${BRAND_LOGO_STORAGE_PREFIX}/${crypto.randomUUID()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(objectPath, validated, {
      cacheControl: '3600',
      contentType: validated.type,
      upsert: false,
    })

  if (uploadError) {
    return { url: null, error: uploadError.message || 'No se pudo subir el logo.' }
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(objectPath)
  return { url: data.publicUrl, error: null }
}

export async function deleteBrandLogoClient(
  publicUrl: string | null | undefined,
  organizationId: string
): Promise<void> {
  if (!publicUrl) return

  const objectPath = getProductImageStoragePath(publicUrl)
  if (!objectPath || !objectPath.startsWith(`${organizationId}/${BRAND_LOGO_STORAGE_PREFIX}/`)) {
    return
  }

  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([objectPath])

  if (error) {
    console.error('deleteBrandLogoClient', error)
  }
}
