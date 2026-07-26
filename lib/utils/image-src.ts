import { getProxiedLogoSrc, isSupabaseStoragePublicUrl } from '@/lib/theme/branding'

export const IMAGE_SIZES = {
  thumbnail: '48px',
  productCard: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px',
  productLine: '56px',
  logo: '200px',
  preview: '(max-width: 640px) 100vw, 400px',
  wallpaper: '100vw',
} as const

export function isNativeImageSrc(src: string): boolean {
  return src.startsWith('blob:') || src.startsWith('data:')
}

export function isAnimatedImageSrc(src: string): boolean {
  const lower = src.toLowerCase().split('?')[0] ?? ''
  return lower.endsWith('.gif')
}

/**
 * Reescribe URLs públicas de Storage al host de NEXT_PUBLIC_SUPABASE_URL.
 * Útil tras migrar de proyecto: next/image solo permite el hostname configurado.
 */
export function rewriteSupabaseStorageSrc(url: string): string {
  if (!isSupabaseStoragePublicUrl(url)) return url

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!base) return url

  try {
    const current = new URL(url)
    const target = new URL(base)
    if (!current.hostname.endsWith('.supabase.co')) return url
    if (current.hostname === target.hostname) return url

    current.protocol = target.protocol
    current.hostname = target.hostname
    current.port = target.port
    return current.toString()
  } catch {
    return url
  }
}

export function resolveImageSrc(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (isNativeImageSrc(trimmed)) return trimmed
  if (trimmed.startsWith('/api/brand-logo')) return trimmed
  return getProxiedLogoSrc(rewriteSupabaseStorageSrc(trimmed))
}

export function canOptimizeWithNextImage(src: string): boolean {
  if (!src || isNativeImageSrc(src) || isAnimatedImageSrc(src)) return false
  if (src.startsWith('/')) return true
  return isSupabaseStoragePublicUrl(src)
}
