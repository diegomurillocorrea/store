'use client'

import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect } from 'react'
import type { SalesStatistics } from '@/lib/data/statistics-types'
import { formatCurrency } from '@/lib/utils/money'
import {
  BALANCE_PERIOD_OPTIONS,
  formatDisplayDateRange,
  getBrowserLocalDateString,
  type BalancePeriod,
} from '@/lib/utils/local-date'
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
} from '@/styles/catalyst-ui-kit/dropdown'
import { Input } from '@/styles/catalyst-ui-kit/input'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface StatisticsPanelProps {
  orgSlug: string
  selectedDate: string
  selectedEndDate: string
  startDate: string
  endDate: string
  selectedPeriod: BalancePeriod
  hasExplicitDate: boolean
  timeZone: string
  statistics: SalesStatistics
}

const surfaceClass =
  'border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900'

const inputClass =
  'border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'

function SummaryCard({
  label,
  value,
  tone,
  icon: Icon,
  subtitle,
}: {
  label: string
  value: string
  tone: 'neutral' | 'positive' | 'negative'
  icon: React.ComponentType<{ className?: string }>
  subtitle?: string
}) {
  const valueClass =
    tone === 'positive'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'negative'
        ? 'text-red-600 dark:text-red-400'
        : 'text-zinc-900 dark:text-zinc-100'

  const iconClass =
    tone === 'positive'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'negative'
        ? 'text-red-600 dark:text-red-400'
        : 'text-zinc-500 dark:text-zinc-400'

  return (
    <div className={`rounded-2xl p-5 ${surfaceClass}`}>
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
          <Icon className={`size-5 ${iconClass}`} aria-hidden="true" />
        </div>
        <div>
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">{label}</Text>
          <p className={`mt-1 text-2xl font-semibold tracking-tight ${valueClass}`}>{value}</p>
          {subtitle ? (
            <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</Text>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function StatisticsPanel({
  orgSlug,
  selectedDate,
  selectedEndDate,
  startDate,
  endDate,
  selectedPeriod,
  hasExplicitDate,
  timeZone,
  statistics,
}: StatisticsPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const periodLabel =
    BALANCE_PERIOD_OPTIONS.find((option) => option.id === selectedPeriod)?.label ?? 'Diario'
  const isCustomPeriod = selectedPeriod === 'personalizado'

  const buildStatisticsHref = useCallback(
    ({
      fecha = selectedDate,
      fechaHasta = selectedEndDate,
      periodo = selectedPeriod,
    }: {
      fecha?: string
      fechaHasta?: string
      periodo?: BalancePeriod
    } = {}) => {
      const params = new URLSearchParams()
      if (fecha) params.set('fecha', fecha)
      if (periodo !== 'diario') params.set('periodo', periodo)
      if (periodo === 'personalizado' && fechaHasta) {
        params.set('fechaHasta', fechaHasta)
      }
      const query = params.toString()
      return query ? `/${orgSlug}/estadisticas?${query}` : `/${orgSlug}/estadisticas`
    },
    [orgSlug, selectedDate, selectedEndDate, selectedPeriod]
  )

  useEffect(() => {
    const fechaParam = searchParams.get('fecha')
    if (fechaParam) return

    const localToday = getBrowserLocalDateString()
    if (selectedDate !== localToday) {
      router.replace(buildStatisticsHref({ fecha: localToday }))
    }
  }, [buildStatisticsHref, hasExplicitDate, router, searchParams, selectedDate])

  const handlePeriodChange = (periodo: BalancePeriod) => {
    if (periodo === selectedPeriod) return
    router.push(
      buildStatisticsHref({
        periodo,
        fechaHasta: periodo === 'personalizado' ? selectedEndDate || selectedDate : undefined,
      })
    )
  }

  const handleDateChange = (value: string) => {
    router.push(
      buildStatisticsHref({
        fecha: value,
        fechaHasta:
          isCustomPeriod && selectedEndDate < value ? value : selectedEndDate,
      })
    )
  }

  const handleEndDateChange = (value: string) => {
    router.push(
      buildStatisticsHref({
        fechaHasta: value,
        fecha: selectedDate > value ? value : selectedDate,
      })
    )
  }

  const profitValue =
    statistics.profit != null ? formatCurrency(statistics.profit) : '—'

  const profitTone =
    statistics.profit == null
      ? 'neutral'
      : statistics.profit >= 0
        ? 'positive'
        : 'negative'

  const marginPercent =
    statistics.profit != null && statistics.totalSold > 0
      ? `${((statistics.profit / statistics.totalSold) * 100).toFixed(1)}% margen`
      : undefined

  const hasMissingCostData =
    statistics.linesWithoutCost > 0 && statistics.totalLines > 0

  const costNote = hasMissingCostData
    ? `${statistics.linesWithoutCost} de ${statistics.totalLines} líneas sin costo registrado`
    : undefined

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Estadísticas
        </h1>
        <Text className="mt-1 text-zinc-500 dark:text-zinc-400">
          Ventas, inversión y ganancia según el periodo seleccionado.
        </Text>
      </div>

      <div className="mt-8 flex w-full flex-wrap items-center gap-2">
        <Dropdown>
          <DropdownButton
            outline
            className={`shrink-0 rounded-xl! ${surfaceClass}`}
            aria-label="Periodo"
          >
            <CalendarDaysIcon data-slot="icon" aria-hidden="true" />
            {periodLabel}
            <ChevronDownIcon data-slot="icon" aria-hidden="true" />
          </DropdownButton>
          <DropdownMenu anchor="bottom start">
            {BALANCE_PERIOD_OPTIONS.map((option) => (
              <DropdownItem
                key={option.id}
                onClick={() => handlePeriodChange(option.id)}
              >
                {option.label}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>

        {isCustomPeriod ? (
          <>
            <Input
              type="date"
              value={selectedDate}
              onChange={(event) => handleDateChange(event.target.value)}
              aria-label="Fecha desde"
              className={`w-auto! shrink-0 ${inputClass}`}
            />
            <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">a</span>
            <Input
              type="date"
              value={selectedEndDate}
              onChange={(event) => handleEndDateChange(event.target.value)}
              aria-label="Fecha hasta"
              className={`w-auto! shrink-0 ${inputClass}`}
            />
          </>
        ) : (
          <Input
            type="date"
            value={selectedDate}
            onChange={(event) => handleDateChange(event.target.value)}
            aria-label="Fecha"
            className={`w-auto! shrink-0 ${inputClass}`}
          />
        )}

        <span
          className={`inline-flex shrink-0 rounded-xl px-3 py-2 text-sm ${surfaceClass}`}
        >
          <span className="whitespace-nowrap text-zinc-600 dark:text-zinc-300">
            {formatDisplayDateRange(startDate, endDate, timeZone)}
          </span>
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Lo que se vendió"
          value={formatCurrency(statistics.totalSold)}
          tone="positive"
          icon={ShoppingBagIcon}
          subtitle={
            statistics.salesCount === 1
              ? '1 venta completada'
              : `${statistics.salesCount} ventas completadas`
          }
        />
        <SummaryCard
          label="Lo que se invirtió"
          value={formatCurrency(statistics.totalInvested)}
          tone="neutral"
          icon={BanknotesIcon}
          subtitle={costNote}
        />
        <SummaryCard
          label="Ganancia"
          value={profitValue}
          tone={profitTone}
          icon={statistics.profit != null && statistics.profit >= 0 ? ArrowTrendingUpIcon : ChartBarIcon}
          subtitle={
            statistics.profit == null
              ? 'Agrega costo a los productos para calcular la ganancia'
              : marginPercent
          }
        />
      </div>

      {statistics.salesCount === 0 ? (
        <div className={`mt-8 rounded-2xl p-8 text-center ${surfaceClass}`}>
          <ChartBarIcon
            className="mx-auto size-10 text-zinc-400 dark:text-zinc-500"
            aria-hidden="true"
          />
          <Text className="mt-4 text-zinc-600 dark:text-zinc-300">
            {startDate === endDate
              ? 'No hay ventas completadas en esta fecha.'
              : 'No hay ventas completadas en este periodo.'}
          </Text>
        </div>
      ) : null}
    </>
  )
}
