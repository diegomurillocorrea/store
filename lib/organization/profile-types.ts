export const WEEKDAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
] as const

export type WeekdayKey = (typeof WEEKDAYS)[number]['key']

export interface DayHours {
  closed: boolean
  open: string
  close: string
}

export type BusinessHours = Record<WeekdayKey, DayHours>

export interface SocialLinks {
  website?: string
  instagram?: string
  facebook?: string
  tiktok?: string
  whatsapp?: string
  youtube?: string
  x?: string
}

export interface OrganizationProfile {
  organizationId: string
  name: string
  slug: string
  description: string
  locationAddress: string
  locationLat: number | null
  locationLng: number | null
  businessHours: BusinessHours
  socialLinks: SocialLinks
}

export const DEFAULT_DAY_HOURS: DayHours = {
  closed: false,
  open: '09:00',
  close: '18:00',
}

export function createDefaultBusinessHours(): BusinessHours {
  return WEEKDAYS.reduce((acc, day) => {
    acc[day.key] = {
      ...DEFAULT_DAY_HOURS,
      closed: day.key === 'sunday',
    }
    return acc
  }, {} as BusinessHours)
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normalizeOrganizationSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-')
}

export function isValidHttpUrl(raw: string): boolean {
  if (!raw.trim()) return true
  try {
    const url = new URL(raw.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function parseBusinessHours(raw: unknown): BusinessHours {
  const defaults = createDefaultBusinessHours()
  if (!raw || typeof raw !== 'object') return defaults

  const source = raw as Record<string, unknown>
  for (const day of WEEKDAYS) {
    const entry = source[day.key]
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    defaults[day.key] = {
      closed: Boolean(row.closed),
      open: typeof row.open === 'string' ? row.open : defaults[day.key].open,
      close: typeof row.close === 'string' ? row.close : defaults[day.key].close,
    }
  }
  return defaults
}

export function parseSocialLinks(raw: unknown): SocialLinks {
  if (!raw || typeof raw !== 'object') return {}
  const source = raw as Record<string, unknown>
  const keys = ['website', 'instagram', 'facebook', 'tiktok', 'whatsapp', 'youtube', 'x'] as const
  const links: SocialLinks = {}
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) {
      links[key] = value.trim()
    }
  }
  return links
}
