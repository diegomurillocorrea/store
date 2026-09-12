'use client'

import { useMemo, useState } from 'react'
import type {
  StatisticsSeriesGranularity,
  StatisticsSeriesPoint,
} from '@/lib/data/statistics-types'
import { formatCurrency } from '@/lib/utils/money'
import { Text } from '@/styles/catalyst-ui-kit/text'

const VIEW_W = 800
const VIEW_H = 248
const PAD = { top: 16, right: 16, bottom: 36, left: 64 }

const surfaceClass =
  'border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900'

function niceCeiling (value: number): number {
  if (value <= 0) return 1
  const exponent = Math.floor(Math.log10(value))
  const magnitude = 10 ** exponent
  const normalized = value / magnitude
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10
  return nice * magnitude
}

function niceFloor (value: number): number {
  if (value >= 0) return 0
  return -niceCeiling(-value)
}

function niceStep (rough: number): number {
  if (rough <= 0) return 1
  const exponent = Math.floor(Math.log10(rough))
  const magnitude = 10 ** exponent
  const normalized = rough / magnitude
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return nice * magnitude
}

function buildTicks (min: number, max: number): number[] {
  if (min === max) return [min]

  const step = niceStep((max - min) / 3)
  const ticks = [min]
  const first = Math.ceil((min + step / 1000) / step) * step

  for (let value = first; value < max - step / 4; value += step) {
    ticks.push(Number(value.toFixed(6)))
  }

  ticks.push(max)
  return ticks
}

function polyline (points: Array<{ x: number; y: number }>): string {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ')
}

function areaPath (points: Array<{ x: number; y: number }>, zeroY: number): string {
  if (points.length === 0) return ''
  const first = points[0]
  const last = points[points.length - 1]
  return `${polyline(points)} L${last.x.toFixed(1)} ${zeroY.toFixed(1)} L${first.x.toFixed(1)} ${zeroY.toFixed(1)} Z`
}

function labelIndexes (length: number, maxLabels: number): Set<number> {
  if (length <= maxLabels) {
    return new Set(Array.from({ length }, (_, index) => index))
  }

  const indexes = new Set<number>([0, length - 1])
  const inner = maxLabels - 2
  for (let step = 1; step <= inner; step += 1) {
    indexes.add(Math.round((step * (length - 1)) / (inner + 1)))
  }
  return indexes
}

function lastActiveIndex (series: StatisticsSeriesPoint[]): number {
  for (let index = series.length - 1; index >= 0; index -= 1) {
    const point = series[index]
    if (point.sold > 0 || point.invested > 0 || point.profit !== 0) {
      return index
    }
  }
  return Math.max(series.length - 1, 0)
}

function granularityCaption (granularity: StatisticsSeriesGranularity): string {
  if (granularity === 'hour') return 'Por hora'
  if (granularity === 'month') return 'Por mes'
  return 'Por día'
}

export function StatisticsTrendChart({
  series,
  granularity,
  hasSales,
}: {
  series: StatisticsSeriesPoint[]
  granularity: StatisticsSeriesGranularity
  hasSales: boolean
}) {
  const defaultIndex = useMemo(() => lastActiveIndex(series), [series])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const selectedIndex = activeIndex ?? defaultIndex
  const selected = series[selectedIndex] ?? null

  const plot = useMemo(() => {
    const investedValues = series.map((point) => point.invested)
    const profitValues = series.map((point) => point.profit)
    const rawMin = Math.min(0, ...investedValues, ...profitValues)
    const rawMax = Math.max(0, ...investedValues, ...profitValues)
    const min = niceFloor(rawMin)
    const max = rawMax === 0 && min === 0 ? 1 : niceCeiling(rawMax)
    const innerWidth = VIEW_W - PAD.left - PAD.right
    const innerHeight = VIEW_H - PAD.top - PAD.bottom
    const span = max - min || 1

    const xAt = (index: number) => {
      if (series.length <= 1) return PAD.left + innerWidth / 2
      return PAD.left + (index / (series.length - 1)) * innerWidth
    }

    const yAt = (value: number) =>
      PAD.top + ((max - value) / span) * innerHeight

    const investedPoints = series.map((point, index) => ({
      x: xAt(index),
      y: yAt(point.invested),
    }))
    const profitPoints = series.map((point, index) => ({
      x: xAt(index),
      y: yAt(point.profit),
    }))

    return {
      min,
      max,
      zeroY: yAt(0),
      xAt,
      yAt,
      innerWidth,
      investedPoints,
      profitPoints,
      ticks: buildTicks(min, max),
      visibleLabels:
        granularity === 'hour'
          ? new Set([0, 6, 12, 18, Math.max(series.length - 1, 0)])
          : labelIndexes(series.length, 7),
    }
  }, [granularity, series])

  const handlePointer = (
    event: React.PointerEvent<SVGSVGElement>
  ) => {
    if (series.length === 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const viewX = ((event.clientX - rect.left) / rect.width) * VIEW_W
    const clamped = Math.min(Math.max(viewX, PAD.left), VIEW_W - PAD.right)
    const ratio =
      series.length <= 1
        ? 0
        : (clamped - PAD.left) / (VIEW_W - PAD.left - PAD.right)
    const nextIndex = Math.round(ratio * (series.length - 1))
    setActiveIndex(nextIndex)
  }

  return (
    <section className={`rounded-2xl p-5 ${surfaceClass}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Inversión y ganancia
          </h2>
          <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {granularityCaption(granularity)}
          </Text>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-0.5 w-3.5 rounded-full bg-zinc-500 dark:bg-zinc-300"
              aria-hidden="true"
            />
            Inversión
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
            Ganancia
          </span>
        </div>
      </div>

      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-56 w-full cursor-crosshair"
          role="img"
          aria-label="Gráfica de inversión y ganancia del periodo"
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={() => setActiveIndex(null)}
        >
          {plot.ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={VIEW_W - PAD.right}
                y1={plot.yAt(tick)}
                y2={plot.yAt(tick)}
                className="stroke-zinc-100 dark:stroke-zinc-800"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={plot.yAt(tick) + 4}
                textAnchor="end"
                className="fill-zinc-400 text-[11px] dark:fill-zinc-500"
              >
                {formatCurrency(tick)}
              </text>
            </g>
          ))}

          {selected ? (
            <line
              x1={plot.xAt(selectedIndex)}
              x2={plot.xAt(selectedIndex)}
              y1={PAD.top}
              y2={VIEW_H - PAD.bottom}
              className="stroke-zinc-300 dark:stroke-zinc-600"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ) : null}

          <path
            d={areaPath(plot.investedPoints, plot.zeroY)}
            className="fill-zinc-200/80 dark:fill-zinc-600/35"
          />
          <path
            d={polyline(plot.investedPoints)}
            className="stroke-zinc-500 dark:stroke-zinc-300"
            fill="none"
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={areaPath(plot.profitPoints, plot.zeroY)}
            className="fill-emerald-500/15 dark:fill-emerald-400/15"
          />
          <path
            d={polyline(plot.profitPoints)}
            className="stroke-emerald-500 dark:stroke-emerald-400"
            fill="none"
            strokeWidth="2.25"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {selected ? (
            <>
              <circle
                cx={plot.xAt(selectedIndex)}
                cy={plot.yAt(selected.invested)}
                r="4"
                className="fill-white stroke-zinc-400 dark:fill-zinc-900 dark:stroke-zinc-400"
                strokeWidth="2"
              />
              <circle
                cx={plot.xAt(selectedIndex)}
                cy={plot.yAt(selected.profit)}
                r="4"
                className="fill-white stroke-emerald-500 dark:fill-zinc-900 dark:stroke-emerald-400"
                strokeWidth="2"
              />
            </>
          ) : null}

          {series.map((point, index) => (
            plot.visibleLabels.has(index) ? (
              <text
                key={point.key}
                x={plot.xAt(index)}
                y={VIEW_H - 12}
                textAnchor="middle"
                className="fill-zinc-400 text-[11px] dark:fill-zinc-500"
              >
                {point.label}
              </text>
            ) : null
          ))}
        </svg>

        {!hasSales ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Text className="rounded-xl bg-white/80 px-3 py-1.5 text-sm text-zinc-500 dark:bg-zinc-900/80 dark:text-zinc-400">
              No hay ventas en este periodo.
            </Text>
          </div>
        ) : null}
      </div>

      {selected ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">{selected.label}</span>
          <span className="text-zinc-700 dark:text-zinc-300">
            Inversión {formatCurrency(selected.invested)}
          </span>
          <span
            className={
              selected.profit >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }
          >
            Ganancia {formatCurrency(selected.profit)}
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            Vendido {formatCurrency(selected.sold)}
          </span>
        </div>
      ) : null}
    </section>
  )
}
