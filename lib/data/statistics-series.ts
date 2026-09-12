import type {
  StatisticsSeriesGranularity,
  StatisticsSeriesPoint,
} from '@/lib/data/statistics-types'
import {
  countInclusiveCalendarDays,
  eachCalendarDate,
  eachYearMonth,
  getDateStringInTimeZone,
  getHourInTimeZone,
  getYearMonthInTimeZone,
} from '@/lib/utils/local-date'

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
})

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('es-MX', {
  month: 'short',
})

function emptyPoint (key: string, label: string): StatisticsSeriesPoint {
  return {
    key,
    label,
    sold: 0,
    invested: 0,
    profit: 0,
  }
}

function formatHourLabel (hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

function formatDayLabel (date: string): string {
  return DAY_LABEL_FORMATTER.format(new Date(`${date}T12:00:00`))
}

function formatMonthLabel (yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number)
  return MONTH_LABEL_FORMATTER.format(new Date(Date.UTC(year, month - 1, 1, 12)))
}

export function resolveStatisticsGranularity (
  startDate: string,
  endDate: string
): StatisticsSeriesGranularity {
  if (startDate === endDate) return 'hour'
  if (countInclusiveCalendarDays(startDate, endDate) <= 45) return 'day'
  return 'month'
}

export function buildStatisticsSeries (
  startDate: string,
  endDate: string,
  granularity: StatisticsSeriesGranularity
): StatisticsSeriesPoint[] {
  if (granularity === 'hour') {
    return Array.from({ length: 24 }, (_, hour) => {
      const key = `${startDate}T${String(hour).padStart(2, '0')}`
      return emptyPoint(key, formatHourLabel(hour))
    })
  }

  if (granularity === 'month') {
    return eachYearMonth(startDate, endDate).map((key) =>
      emptyPoint(key, formatMonthLabel(key))
    )
  }

  return eachCalendarDate(startDate, endDate).map((key) =>
    emptyPoint(key, formatDayLabel(key))
  )
}

export function getStatisticsBucketKey (
  createdAt: string,
  granularity: StatisticsSeriesGranularity,
  timeZone: string
): string {
  if (granularity === 'hour') {
    const date = getDateStringInTimeZone(new Date(createdAt), timeZone)
    const hour = getHourInTimeZone(createdAt, timeZone)
    return `${date}T${String(hour).padStart(2, '0')}`
  }

  if (granularity === 'month') {
    return getYearMonthInTimeZone(createdAt, timeZone)
  }

  return getDateStringInTimeZone(new Date(createdAt), timeZone)
}
