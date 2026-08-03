import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getProductImageStoragePath,
  PRODUCT_IMAGE_BUCKET,
} from '@/lib/utils/product-image'

export const BRAND_LOGO_STORAGE_PREFIX = 'brand/logos'

const ALLOWED_LOGO_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

export const MAX_BRAND_LOGO_BYTES = 2 * 1024 * 1024

export function getExtensionFromLogoMime(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    default:
      return 'bin'
  }
}

export function validateBrandLogoUpload(file: File): { error: string } | File {
  if (!ALLOWED_LOGO_TYPES.has(file.type)) {
    return { error: 'El logo debe ser JPG, PNG o WebP.' }
  }

  if (file.size > MAX_BRAND_LOGO_BYTES) {
    return { error: 'El logo no puede superar 2 MB.' }
  }

  return file
}

export function shouldRemoveBrandLogo(formData: FormData): boolean {
  return String(formData.get('removeLogo') ?? '') === 'true'
}

export function parseBrandLogoUrlFromForm(formData: FormData): string | null {
  const raw = String(formData.get('logoUrl') ?? '').trim()
  return raw.length > 0 ? raw : null
}

export function isValidBrandLogoStorageUrl(
  publicUrl: string,
  organizationId: string
): boolean {
  const objectPath = getProductImageStoragePath(publicUrl)
  if (!objectPath) return false
  return objectPath.startsWith(`${organizationId}/${BRAND_LOGO_STORAGE_PREFIX}/`)
}

export function isAcceptableBrandLogoUrl(
  publicUrl: string,
  organizationId: string,
  currentLogoUrl: string | null
): boolean {
  if (isValidBrandLogoStorageUrl(publicUrl, organizationId)) return true
  if (currentLogoUrl && publicUrl === currentLogoUrl) return true
  return false
}

export async function deleteBrandLogoByUrl(
  supabase: SupabaseClient,
  publicUrl: string | null | undefined,
  organizationId: string
): Promise<void> {
  if (!publicUrl || !isValidBrandLogoStorageUrl(publicUrl, organizationId)) return

  const objectPath = getProductImageStoragePath(publicUrl)
  if (!objectPath) return

  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([objectPath])
  if (error) {
    console.error('deleteBrandLogoByUrl', error)
  }
}
