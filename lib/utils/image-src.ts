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

export function resolveImageSrc(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (isNativeImageSrc(trimmed)) return trimmed
  if (trimmed.startsWith('/api/brand-logo')) return trimmed
  return getProxiedLogoSrc(trimmed)
}

export function canOptimizeWithNextImage(src: string): boolean {
  if (!src || isNativeImageSrc(src) || isAnimatedImageSrc(src)) return false
  if (src.startsWith('/')) return true
  return isSupabaseStoragePublicUrl(src)
}
