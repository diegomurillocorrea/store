export const PHONE_COUNTRY_CODE = '503'
export const PHONE_LOCAL_LENGTH = 8

export function extractPhoneDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function parsePhoneLocalDigits(value: string | null | undefined): string {
  if (!value) return ''

  const digits = extractPhoneDigits(value)

  if (digits.startsWith(PHONE_COUNTRY_CODE) && digits.length > PHONE_LOCAL_LENGTH) {
    return digits.slice(PHONE_COUNTRY_CODE.length, PHONE_COUNTRY_CODE.length + PHONE_LOCAL_LENGTH)
  }

  return digits.slice(0, PHONE_LOCAL_LENGTH)
}

export function formatPhoneLocalDisplay(digits: string): string {
  const clean = extractPhoneDigits(digits).slice(0, PHONE_LOCAL_LENGTH)

  if (clean.length <= 4) return clean

  return `${clean.slice(0, 4)} ${clean.slice(4)}`
}

export function formatPhoneForStorage(localDigits: string): string | null {
  const clean = extractPhoneDigits(localDigits).slice(0, PHONE_LOCAL_LENGTH)

  if (clean.length === 0) return null

  return `+${PHONE_COUNTRY_CODE} ${formatPhoneLocalDisplay(clean)}`
}

export function formatPhoneForDisplay(stored: string | null | undefined): string {
  return formatPhoneLocalDisplay(parsePhoneLocalDigits(stored))
}

export function formatPhoneLabel(stored: string | null | undefined): string {
  if (!stored) return '—'

  const local = parsePhoneLocalDigits(stored)

  if (local.length === 0) return stored

  return `+${PHONE_COUNTRY_CODE} ${formatPhoneLocalDisplay(local)}`
}

export function formatPhoneTelHref(stored: string | null | undefined): string | null {
  const local = parsePhoneLocalDigits(stored)

  if (local.length !== PHONE_LOCAL_LENGTH) return null

  return `tel:+${PHONE_COUNTRY_CODE}${local}`
}

export function parsePhoneFormValue(
  raw: string
): { phone: string | null } | { error: string } {
  const trimmed = raw.trim()

  if (trimmed.length === 0) {
    return { phone: null }
  }

  const local = parsePhoneLocalDigits(trimmed)

  if (local.length === 0) {
    return { phone: null }
  }

  if (local.length !== PHONE_LOCAL_LENGTH) {
    return { error: 'El teléfono debe tener 8 dígitos.' }
  }

  return { phone: formatPhoneForStorage(local) }
}
