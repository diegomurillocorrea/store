const UNIT_PRICE_DECIMALS = 4
const UNIT_PRICE_FACTOR = 10 ** UNIT_PRICE_DECIMALS

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

/** Rounds unit/sale prices to match DB NUMERIC(18, 4). */
export function roundUnitPrice(value: number): number {
  return Math.round(value * UNIT_PRICE_FACTOR) / UNIT_PRICE_FACTOR
}

/**
 * Keeps only digits and a single `.` decimal separator.
 * Commas are rejected (stripped). Caps fractional digits at `maxDecimals`.
 */
export function sanitizeDecimalInput(
  raw: string,
  maxDecimals = UNIT_PRICE_DECIMALS
): string {
  const cleaned = raw.replace(/[^\d.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned

  const intPart = cleaned.slice(0, firstDot)
  const decPart = cleaned
    .slice(firstDot + 1)
    .replace(/\./g, '')
    .slice(0, maxDecimals)

  return `${intPart}.${decPart}`
}

export function formatUnitPriceInput(value: number): string {
  return roundUnitPrice(value)
    .toFixed(UNIT_PRICE_DECIMALS)
    .replace(/\.?0+$/, '')
}

export function parseUnitPriceInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0 || trimmed.includes(',')) return null

  const parsed = Number.parseFloat(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0) return null

  return roundUnitPrice(parsed)
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}
