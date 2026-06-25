const DEFAULT_TIME_ZONE = 'America/Mexico_City'

export function getBrowserLocalDateString(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDateStringInTimeZone(
  date = new Date(),
  timeZone = DEFAULT_TIME_ZONE
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getTodayDateString(timeZone = DEFAULT_TIME_ZONE): string {
  return getDateStringInTimeZone(new Date(), timeZone)
}

function getTimeZoneOffsetMs(timeZone: string, date: Date): number {
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  const zoned = new Date(date.toLocaleString('en-US', { timeZone }))
  return zoned.getTime() - utc.getTime()
}

export function getDayBoundsInTimeZone(
  date: string,
  timeZone = DEFAULT_TIME_ZONE
): { start: string; end: string } {
  const [year, month, day] = date.split('-').map(Number)
  const utcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0, 0)
  const offset = getTimeZoneOffsetMs(timeZone, new Date(utcMidnight))
  const start = new Date(utcMidnight - offset)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

export function isValidDateString(value: string | undefined): value is string {
  if (!value) return false
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00`))
}

export function formatDisplayDate(date: string, timeZone?: string): string {
  const parsed = new Date(`${date}T12:00:00`)
  return new Intl.DateTimeFormat('es-MX', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}
