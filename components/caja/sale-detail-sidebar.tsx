'use client'

import {
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  PrinterIcon,
  ShoppingBagIcon,
  TrashIcon,
  UserGroupIcon,
  UserIcon,
  WalletIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { OptimizedImage } from '@/components/optimized-image'
import type { SaleDetail, SaleDetailLine } from '@/lib/data/sale-detail-types'
import { PAYMENT_METHOD_LABELS } from '@/lib/data/balance-types'
import { IMAGE_SIZES } from '@/lib/utils/image-src'
import { formatCurrency } from '@/lib/utils/money'
import { Badge } from '@/styles/catalyst-ui-kit/badge'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface SaleDetailSidebarProps {
  open: boolean
  sale: SaleDetail | null
  isLoading: boolean
  error: string | null
  onClose: () => void
}

const paymentStatusLabels: Record<SaleDetail['paymentStatus'], string> = {
  paid: 'Pagada',
  credit: 'Crédito',
  voided: 'Anulada',
  draft: 'Borrador',
}

const paymentStatusColors: Record<SaleDetail['paymentStatus'], 'emerald' | 'amber' | 'red' | 'zinc'> = {
  paid: 'emerald',
  credit: 'amber',
  voided: 'red',
  draft: 'zinc',
}

function formatDetailDateTime(value: string): string {
  const date = new Date(value)
  const timePart = new Intl.DateTimeFormat('es-MX', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
  const datePart = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)

  return `${timePart} | ${datePart}`
}

function formatQuantityLabel(quantity: number): string {
  const label = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2)
  const unit = quantity === 1 ? 'Unidad' : 'Unidades'
  return `${label} ${unit}`
}

function DetailRow({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 size-5 shrink-0 text-zinc-400" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">{label}</Text>
        <p className={clsx('mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-100', valueClassName)}>
          {value}
        </p>
      </div>
    </div>
  )
}

function ProductLineItem({ line }: { line: SaleDetailLine }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
        <OptimizedImage
          src={line.imageUrl ?? ''}
          alt={line.productName}
          fill
          sizes={IMAGE_SIZES.productLine}
          className="rounded-xl"
          fallback={
            <span className="flex size-full items-center justify-center text-lg font-semibold text-zinc-400">
              {line.productName.charAt(0).toUpperCase()}
            </span>
          }
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-medium text-zinc-900 dark:text-zinc-100">{line.productName}</p>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {formatQuantityLabel(line.quantity)}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {formatCurrency(line.unitPrice)} x Und
        </p>
      </div>

      <p className="shrink-0 font-semibold text-zinc-900 dark:text-zinc-100">
        {formatCurrency(line.lineTotal)}
      </p>
    </div>
  )
}

function ActionButton({
  label,
  icon: Icon,
  tone = 'default',
  disabled = true,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  tone?: 'default' | 'danger'
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={clsx(
        'flex flex-col items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50',
        tone === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-zinc-700 dark:text-zinc-300'
      )}
    >
      <span
        className={clsx(
          'flex size-12 items-center justify-center rounded-full border',
          tone === 'danger'
            ? 'border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10'
            : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}

export function SaleDetailSidebar({
  open,
  sale,
  isLoading,
  error,
  onClose,
}: SaleDetailSidebarProps) {
  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/60 lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        aria-label="Detalle de la venta"
        aria-hidden={!open}
        className={clsx(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:border-zinc-800 dark:bg-zinc-900',
          open ? 'translate-x-0' : 'pointer-events-none translate-x-full'
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
              <ShoppingBagIcon className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Detalle de la venta
              </h2>
              {sale ? (
                <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
                  {sale.concept}
                </p>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            aria-label="Cerrar detalle"
          >
            <XMarkIcon className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4 dark:bg-zinc-900">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Text className="text-zinc-500 dark:text-zinc-400">Cargando detalle…</Text>
            </div>
          ) : null}

          {!isLoading && error ? (
            <Text className="rounded-xl border border-red-500/30 bg-red-50 px-4 py-3 text-red-800! dark:bg-red-950/40 dark:text-red-200!" role="alert">
              {error}
            </Text>
          ) : null}

          {!isLoading && sale ? (
            <div className="space-y-6">
              <div className="text-center">
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                  Transacción #{sale.displayNumber}
                </Text>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Text className="text-sm text-zinc-500 dark:text-zinc-400">Valor total</Text>
                    <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(sale.total)}
                    </p>
                  </div>
                  <Badge color={paymentStatusColors[sale.paymentStatus]}>
                    {paymentStatusLabels[sale.paymentStatus]}
                  </Badge>
                </div>

                <div className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-700">
                  <DetailRow
                    icon={CalendarDaysIcon}
                    label="Fecha y hora"
                    value={formatDetailDateTime(sale.createdAt)}
                  />
                  <DetailRow
                    icon={WalletIcon}
                    label="Método de pago"
                    value={
                      sale.paymentMethod
                        ? PAYMENT_METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod
                        : '—'
                    }
                  />
                  <DetailRow
                    icon={UserIcon}
                    label="Cliente"
                    value={sale.customerName ?? '—'}
                  />
                  <DetailRow
                    icon={UserGroupIcon}
                    label="Empleado"
                    value={sale.employeeName ?? '—'}
                  />
                  <DetailRow
                    icon={ArrowTrendingUpIcon}
                    label="Ganancia"
                    value={sale.profit != null ? formatCurrency(sale.profit) : '—'}
                    valueClassName={
                      sale.profit != null && sale.profit > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : undefined
                    }
                  />
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Listado de productos
                </h3>
                <div className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-700">
                  {sale.lines.map((line) => (
                    <ProductLineItem key={line.id} line={line} />
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {sale ? (
          <div className="border-t border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="grid grid-cols-4 gap-2">
              <ActionButton label="Imprimir" icon={PrinterIcon} />
              <ActionButton label="Comprobante" icon={DocumentTextIcon} />
              <ActionButton label="Editar" icon={PencilSquareIcon} />
              <ActionButton label="Eliminar" icon={TrashIcon} tone="danger" />
            </div>
          </div>
        ) : null}
      </aside>
    </>
  )
}
