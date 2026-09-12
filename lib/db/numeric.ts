/** Convierte numeric de Postgres (string) a number usable en la app. */
export function toNumber (value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : null
}

export function toNumberOrZero (value: number | string | null | undefined): number {
  return toNumber(value) ?? 0
}
