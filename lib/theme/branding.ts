export interface OrganizationBranding {
  logoUrl: string | null
  /** Imagen de fondo del panel principal (tipo WhatsApp); URL https pública */
  panelWallpaperUrl: string | null
  /** Título / nombre destacado — modo claro */
  primaryColorLight: string
  /** Título / nombre destacado — modo oscuro */
  primaryColorDark: string
  /** Acentos (borde activo, enlaces) — modo claro */
  accentColorLight: string
  /** Acentos — modo oscuro */
  accentColorDark: string
  /** Texto secundario (antes gris zinc) — modo claro */
  mutedColorLight: string
  /** Texto secundario — modo oscuro */
  mutedColorDark: string
  /** Fondo del marco (exterior) — modo claro */
  shellBackgroundLight: string
  /** Fondo del marco — modo oscuro */
  shellBackgroundDark: string
  /** Panel principal de contenido — modo claro */
  shellSurfaceLight: string
  /** Panel principal de contenido — modo oscuro */
  shellSurfaceDark: string
}

/** Fallback si aún no hay fila en `organization_settings` (la fuente de verdad es la BD). */
export const DEFAULT_BRANDING: OrganizationBranding = {
  logoUrl: null,
  panelWallpaperUrl: null,
  primaryColorLight: '#27272a',
  primaryColorDark: '#e4e4e7',
  accentColorLight: '#2563eb',
  accentColorDark: '#60a5fa',
  mutedColorLight: '#71717a',
  mutedColorDark: '#a3a3a3',
  shellBackgroundLight: '#fffbf4',
  shellBackgroundDark: '#22180f',
  shellSurfaceLight: '#fffcf7',
  shellSurfaceDark: '#2e261c',
}

const HEX_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export function normalizeHex(input: string): string | null {
  const s = input.trim()
  if (!HEX_REGEX.test(s)) return null
  if (s.length === 4) {
    const r = s[1]
    const g = s[2]
    const b = s[3]
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return s.toLowerCase()
}

export function isValidLogoUrl(input: string): boolean {
  const s = input.trim()
  if (s.length === 0) return true
  if (s.length > 2048) return false
  try {
    const u = new URL(s)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

/** Instagram/Meta suelen bloquear <img> directo; usar proxy same-origin */
export function logoUrlNeedsProxy(url: string): boolean {
  const s = url.trim().toLowerCase()
  if (!s.startsWith('http')) return false
  try {
    const host = new URL(s).hostname.toLowerCase()
    if (host.includes('instagram')) return true
    if (host.includes('fbcdn.net')) return true
    if (host.includes('facebook.com')) return true
    if (host.includes('cdninstagram')) return true
    return false
  } catch {
    return false
  }
}

export function getProxiedLogoSrc(url: string): string {
  if (!logoUrlNeedsProxy(url)) return url
  return `/api/brand-logo?url=${encodeURIComponent(url)}`
}
