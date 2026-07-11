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

export function getDateRangeBoundsInTimeZone(
  startDate: string,
  endDate: string,
  timeZone = DEFAULT_TIME_ZONE
): { start: string; end: string } {
  return {
    start: getDayBoundsInTimeZone(startDate, timeZone).start,
    end: getDayBoundsInTimeZone(endDate, timeZone).end,
  }
}

export function isValidDateString(value: string | undefined): value is string {
  if (!value) return false
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00`))
}

export type BalancePeriod =
  | 'diario'
  | 'semana'
  | 'mes'
  | 'semestre'
  | 'personalizado'

export const BALANCE_PERIOD_OPTIONS: { id: BalancePeriod; label: string }[] = [
  { id: 'diario', label: 'Diario' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'semestre', label: 'Semestre' },
  { id: 'personalizado', label: 'Periodo personalizado' },
]

export function isValidBalancePeriod(value: string | undefined): value is BalancePeriod {
  return (
    value === 'diario' ||
    value === 'semana' ||
    value === 'mes' ||
    value === 'semestre' ||
    value === 'personalizado'
  )
}

function parseDateParts(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split('-').map(Number)
  return { year, month, day }
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getWeekRange(date: string): { startDate: string; endDate: string } {
  const { year, month, day } = parseDateParts(date)
  const anchor = new Date(Date.UTC(year, month - 1, day, 12))
  const dayOfWeek = anchor.getUTCDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(anchor)
  monday.setUTCDate(anchor.getUTCDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)

  return {
    startDate: toDateString(
      monday.getUTCFullYear(),
      monday.getUTCMonth() + 1,
      monday.getUTCDate()
    ),
    endDate: toDateString(
      sunday.getUTCFullYear(),
      sunday.getUTCMonth() + 1,
      sunday.getUTCDate()
    ),
  }
}

export function getMonthRange(date: string): { startDate: string; endDate: string } {
  const { year, month } = parseDateParts(date)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()

  return {
    startDate: toDateString(year, month, 1),
    endDate: toDateString(year, month, lastDay),
  }
}

export function getSemesterRange(date: string): { startDate: string; endDate: string } {
  const { year, month } = parseDateParts(date)

  if (month <= 6) {
    return {
      startDate: toDateString(year, 1, 1),
      endDate: toDateString(year, 6, 30),
    }
  }

  return {
    startDate: toDateString(year, 7, 1),
    endDate: toDateString(year, 12, 31),
  }
}

export function resolveBalanceDateRange(
  period: BalancePeriod,
  date: string,
  endDate?: string
): { startDate: string; endDate: string } {
  if (period === 'diario') {
    return { startDate: date, endDate: date }
  }

  if (period === 'semana') {
    return getWeekRange(date)
  }

  if (period === 'mes') {
    return getMonthRange(date)
  }

  if (period === 'semestre') {
    return getSemesterRange(date)
  }

  const customEnd = isValidDateString(endDate) ? endDate : date
  if (customEnd < date) {
    return { startDate: customEnd, endDate: date }
  }

  return { startDate: date, endDate: customEnd }
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

export function formatDisplayDateRange(
  startDate: string,
  endDate: string,
  timeZone?: string
): string {
  if (startDate === endDate) {
    return formatDisplayDate(startDate, timeZone)
  }

  return `${formatDisplayDate(startDate, timeZone)} – ${formatDisplayDate(endDate, timeZone)}`
}
