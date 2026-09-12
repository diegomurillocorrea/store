'use client'

import {
  ArrowLeftIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  CheckIcon,
  ChevronRightIcon,
  CreditCardIcon,
  CubeIcon,
  Squares2X2Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useActionState, useEffect, useMemo, useState } from 'react'
import { CustomerOptionCombobox } from '@/components/pos/customer-option-combobox'
import { OptimizedImage } from '@/components/optimized-image'
import { updateSaleAction } from '@/lib/actions/sale-actions'
import type { CustomerRow } from '@/lib/data/customer-types'
import type { SaleDetail, SaleDetailLine } from '@/lib/data/sale-detail-types'
import { useFormActionSuccess } from '@/lib/hooks/use-form-action-success'
import {
  calculateSaleTotals,
  POS_PAYMENT_METHOD_LABELS,
  roundMoney,
  type PosPaymentMethod,
  type SaleActionState,
} from '@/lib/pos/sale-types'
import { IMAGE_SIZES } from '@/lib/utils/image-src'
import { getDateStringInTimeZone, DEFAULT_TIME_ZONE } from '@/lib/utils/local-date'
import { formatCurrency } from '@/lib/utils/money'
import { Text } from '@/styles/catalyst-ui-kit/text'
import { Textarea } from '@/styles/catalyst-ui-kit/textarea'

const initialState: SaleActionState = { error: null, ok: false }

const paidMethods = Object.keys(POS_PAYMENT_METHOD_LABELS) as Array<
  Exclude<PosPaymentMethod, 'credit'>
>

const paymentMethodMeta: Record<
  Exclude<PosPaymentMethod, 'credit'>,
  {
    label: string
    icon: React.ComponentType<{ className?: string }>
  }
> = {
  cash: { label: POS_PAYMENT_METHOD_LABELS.cash, icon: BanknotesIcon },
  card: { label: POS_PAYMENT_METHOD_LABELS.card, icon: CreditCardIcon },
  transfer: { label: 'Transferencia bancaria', icon: BuildingLibraryIcon },
  other: { label: POS_PAYMENT_METHOD_LABELS.other, icon: Squares2X2Icon },
}

interface EditSaleDialogProps {
  orgSlug: string
  sale: SaleDetail | null
  customers: CustomerRow[]
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  timeZone?: string
}

function resolveInitialPaymentMethod (sale: SaleDetail): PosPaymentMethod {
  if (sale.paymentStatus === 'credit' || sale.paymentMethod === 'credit') {
    return 'credit'
  }

  if (
    sale.paymentMethod === 'cash' ||
    sale.paymentMethod === 'card' ||
    sale.paymentMethod === 'transfer' ||
    sale.paymentMethod === 'other'
  ) {
    return sale.paymentMethod
  }

  return 'cash'
}

function formatSaleDate (value: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function toDateInputValue (iso: string, timeZone = DEFAULT_TIME_ZONE): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return getDateStringInTimeZone(date, timeZone)
}

function parseDiscountNumber (raw: string): number {
  const parsed = Number(String(raw).replace(',', '.').replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatDiscountPercentDisplay (value: number): string {
  if (Number.isInteger(value)) return String(value)
  return String(roundMoney(value))
}

function formatDiscountAmountDisplay (value: number): string {
  return String(roundMoney(value))
}

function formatQuantityLabel (quantity: number): string {
  const label = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2)
  const unit = quantity === 1 ? 'Unidad' : 'Unidades'
  return `${label} ${unit}`
}

function ProductLineItem ({ line }: { line: SaleDetailLine }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
        <OptimizedImage
          src={line.imageUrl ?? ''}
          alt={line.productName}
          fill
          sizes={IMAGE_SIZES.productLine}
          className="rounded-xl"
          fallback={
            <span className="flex size-full items-center justify-center text-sm font-semibold text-zinc-400">
              {line.productName.charAt(0).toUpperCase()}
            </span>
          }
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{line.productName}</p>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {formatQuantityLabel(line.quantity)} · {formatCurrency(line.unitPrice)}
        </p>
      </div>

      <p className="shrink-0 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {formatCurrency(line.lineTotal)}
      </p>
    </div>
  )
}

function PaymentMethodCard ({
  method,
  selected,
  disabled,
  onSelect,
}: {
  method: Exclude<PosPaymentMethod, 'credit'>
  selected: boolean
  disabled?: boolean
  onSelect: (method: Exclude<PosPaymentMethod, 'credit'>) => void
}) {
  const meta = paymentMethodMeta[method]
  const Icon = meta.icon

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(method)}
      aria-pressed={selected}
      className={clsx(
        'relative flex min-h-30 flex-col items-center justify-center gap-3 rounded-xl border px-3 py-4 text-center transition',
        selected
          ? 'border-emerald-500 bg-emerald-50/40 dark:border-emerald-500 dark:bg-emerald-950/30'
          : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      {selected ? (
        <span className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
          <CheckIcon className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
        </span>
      ) : null}

      <Icon
        className={clsx(
          'size-7',
          selected ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'
        )}
        aria-hidden="true"
      />
      <span
        className={clsx(
          'text-sm font-medium leading-snug',
          selected ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'
        )}
      >
        {meta.label}
      </span>
    </button>
  )
}

export function EditSaleDialog ({
  orgSlug,
  sale,
  customers,
  open,
  onClose,
  onSuccess,
  timeZone = DEFAULT_TIME_ZONE,
}: EditSaleDialogProps) {
  const boundAction = sale ? updateSaleAction.bind(null, orgSlug, sale.id) : null
  const [state, formAction, pending] = useActionState(
    boundAction ?? (async () => initialState),
    initialState
  )
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('cash')
  const [saleDate, setSaleDate] = useState('')
  const [discountPercent, setDiscountPercent] = useState(0)
  const [discountPercentInput, setDiscountPercentInput] = useState('0')
  const [discountAmountInput, setDiscountAmountInput] = useState('0')
  const [saleName, setSaleName] = useState('')
  const [receiptNote, setReceiptNote] = useState('')
  const [showProducts, setShowProducts] = useState(false)

  useEffect(() => {
    if (!open || !sale) return
    setCustomerId(sale.customerId)
    setPaymentMethod(resolveInitialPaymentMethod(sale))
    setSaleDate(toDateInputValue(sale.createdAt, timeZone))
    const initialPercent = sale.discountPercent ?? 0
    const totals = calculateSaleTotals(sale.subtotal, initialPercent)
    setDiscountPercent(initialPercent)
    setDiscountPercentInput(formatDiscountPercentDisplay(initialPercent))
    setDiscountAmountInput(formatDiscountAmountDisplay(totals.discountAmount))
    setSaleName(sale.concept)
    setReceiptNote('')
    setShowProducts(false)
  }, [open, sale, timeZone])

  useFormActionSuccess(
    state.ok,
    onSuccess ?? onClose,
    pending,
    'Venta actualizada correctamente.'
  )

  const productCount = useMemo(() => {
    if (!sale) return 0
    return sale.lines.length
  }, [sale])

  const previewTotals = useMemo(() => {
    if (!sale) return { discountAmount: 0, total: 0 }
    return calculateSaleTotals(sale.subtotal, discountPercent)
  }, [sale, discountPercent])

  const isCredit = paymentMethod === 'credit'
  const selectedPaidMethod =
    paymentMethod === 'credit' ? null : (paymentMethod as Exclude<PosPaymentMethod, 'credit'>)
  const canSubmit = Boolean(saleDate) && !(isCredit && !customerId) && previewTotals.total > 0

  function applyDiscountPercent (nextPercent: number) {
    if (!sale) return
    const safePercent = Math.min(100, Math.max(0, nextPercent))
    const totals = calculateSaleTotals(sale.subtotal, safePercent)
    setDiscountPercent(safePercent)
    setDiscountPercentInput(formatDiscountPercentDisplay(safePercent))
    setDiscountAmountInput(formatDiscountAmountDisplay(totals.discountAmount))
  }

  function handleDiscountPercentChange (raw: string) {
    setDiscountPercentInput(raw)
    if (raw.trim() === '' || raw.endsWith('.') || raw.endsWith(',')) return
    applyDiscountPercent(parseDiscountNumber(raw))
  }

  function handleDiscountAmountChange (raw: string) {
    if (!sale) return
    setDiscountAmountInput(raw)
    if (raw.trim() === '' || raw.endsWith('.') || raw.endsWith(',')) return

    const nextAmount = Math.min(sale.subtotal, Math.max(0, parseDiscountNumber(raw)))
    const nextPercent =
      sale.subtotal > 0 ? roundMoney((nextAmount / sale.subtotal) * 100) : 0
    const totals = calculateSaleTotals(sale.subtotal, nextPercent)
    setDiscountPercent(nextPercent)
    setDiscountPercentInput(formatDiscountPercentDisplay(nextPercent))
    setDiscountAmountInput(formatDiscountAmountDisplay(totals.discountAmount))
  }

  function commitDiscountInputs () {
    applyDiscountPercent(parseDiscountNumber(discountPercentInput))
  }

  if (!sale || !boundAction) return null

  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/60',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={pending ? undefined : onClose}
        aria-hidden="true"
      />

      <aside
        aria-label="Editar venta"
        aria-hidden={!open}
        className={clsx(
          'fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-zinc-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out sm:max-w-md dark:border-zinc-800 dark:bg-zinc-900',
          open ? 'translate-x-0' : 'pointer-events-none translate-x-full'
        )}
      >
        <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3.5 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
            aria-label="Volver"
          >
            <ArrowLeftIcon className="size-5" aria-hidden="true" />
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Editar venta
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Los campos marcados con asterisco (*) son obligatorios
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            aria-label="Cerrar"
          >
            <XMarkIcon className="size-5" aria-hidden="true" />
          </button>
        </div>

        <form action={formAction} key={`${sale.id}-${open}`} className="flex min-h-0 flex-1 flex-col">
          <input type="hidden" name="customerId" value={customerId ?? ''} />
          <input type="hidden" name="paymentMethod" value={paymentMethod} />
          <input type="hidden" name="saleDate" value={saleDate} />
          <input type="hidden" name="discountPercent" value={String(discountPercent)} />

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div>
              <label
                htmlFor="edit-sale-date"
                className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              >
                Fecha de la venta <span className="text-emerald-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="edit-sale-date"
                  type="date"
                  value={saleDate}
                  onChange={(event) => setSaleDate(event.target.value)}
                  required
                  disabled={pending}
                  className="block w-full rounded-xl border border-zinc-200 bg-white py-3 pr-3.5 pl-3.5 text-sm text-zinc-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  aria-label={`Fecha de la venta: ${saleDate ? formatSaleDate(`${saleDate}T12:00:00`) : ''}`}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Productos vendidos
              </label>
              <button
                type="button"
                onClick={() => setShowProducts((prev) => !prev)}
                className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3.5 py-3.5 text-left transition hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
                aria-expanded={showProducts}
              >
                <CubeIcon className="size-5 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                <span className="min-w-0 flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                  {productCount} {productCount === 1 ? 'producto seleccionado' : 'productos seleccionados'}
                </span>
                <ChevronRightIcon
                  className={clsx(
                    'size-5 shrink-0 text-zinc-400 transition',
                    showProducts && 'rotate-90'
                  )}
                  aria-hidden="true"
                />
              </button>

              {showProducts ? (
                <div className="mt-2 divide-y divide-zinc-200 rounded-xl border border-zinc-200 px-3 dark:divide-zinc-700 dark:border-zinc-700">
                  {sale.lines.map((line) => (
                    <ProductLineItem key={line.id} line={line} />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Valor de los productos</span>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {formatCurrency(sale.subtotal)}
              </span>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Descuento
              </label>
              <div className="flex items-center gap-2">
                <label className="relative flex flex-1 items-center rounded-xl border border-zinc-200 bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900">
                  <span className="sr-only">Descuento en porcentaje</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={discountPercentInput}
                    onChange={(event) => handleDiscountPercentChange(event.target.value)}
                    onBlur={commitDiscountInputs}
                    disabled={pending}
                    className="w-full rounded-xl bg-transparent py-3 pr-8 pl-3.5 text-sm text-zinc-800 outline-none disabled:opacity-50 dark:text-zinc-100"
                  />
                  <span className="pointer-events-none absolute right-3.5 text-sm text-zinc-500 dark:text-zinc-400">
                    %
                  </span>
                </label>
                <span className="text-sm font-medium text-zinc-500" aria-hidden="true">
                  =
                </span>
                <label className="flex flex-1 items-center rounded-xl border border-zinc-200 bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900">
                  <span className="sr-only">Descuento en monto</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={discountAmountInput}
                    onChange={(event) => handleDiscountAmountChange(event.target.value)}
                    onBlur={commitDiscountInputs}
                    disabled={pending}
                    className="w-full rounded-xl bg-transparent px-3.5 py-3 text-sm text-zinc-800 outline-none disabled:opacity-50 dark:text-zinc-100"
                  />
                </label>
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-sale-name"
                className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              >
                ¿Quieres darle un nombre a esta venta?
              </label>
              <input
                id="edit-sale-name"
                type="text"
                value={saleName}
                onChange={(event) => setSaleName(event.target.value)}
                readOnly
                className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm text-zinc-800 outline-none dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Selecciona el método de pago <span className="text-emerald-600">*</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                {paidMethods.map((method) => (
                  <PaymentMethodCard
                    key={method}
                    method={method}
                    selected={selectedPaidMethod === method}
                    disabled={pending}
                    onSelect={(next) => setPaymentMethod(next)}
                  />
                ))}
              </div>

              <button
                type="button"
                disabled={pending}
                onClick={() => setPaymentMethod('credit')}
                aria-pressed={isCredit}
                className={clsx(
                  'relative mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition',
                  isCredit
                    ? 'border-emerald-500 bg-emerald-50/40 text-zinc-900 dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-zinc-100'
                    : 'border-zinc-200 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600',
                  pending && 'cursor-not-allowed opacity-50'
                )}
              >
                {isCredit ? (
                  <span className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <CheckIcon className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                ) : null}
                Venta al crédito
              </button>
            </div>

            <CustomerOptionCombobox
              id="edit-sale-customer"
              customers={customers}
              value={customerId}
              onChange={setCustomerId}
              label={isCredit ? 'Cliente *' : 'Cliente'}
              placeholder="Selecciona un cliente"
              disabled={pending}
            />

            <div>
              <label
                htmlFor="edit-sale-receipt-note"
                className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              >
                Nota del comprobante
              </label>
              <Textarea
                id="edit-sale-receipt-note"
                value={receiptNote}
                onChange={(event) => setReceiptNote(event.target.value)}
                placeholder="Agregar nota..."
                rows={4}
                disabled={pending}
                className="rounded-xl!"
              />
            </div>

            {isCredit && !customerId ? (
              <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                Selecciona un cliente para ventas al crédito.
              </Text>
            ) : null}

            {state.error ? (
              <Text
                className="rounded-xl border border-red-500/30 bg-red-50 px-4 py-3 text-red-800! dark:bg-red-950/40 dark:text-red-200!"
                role="alert"
              >
                {state.error}
              </Text>
            ) : null}
          </div>

          <div className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="submit"
              disabled={pending || !canSubmit}
              className="flex w-full items-center gap-3 rounded-2xl bg-zinc-900 px-4 py-3.5 text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-700 text-sm font-semibold dark:bg-zinc-300">
                {productCount}
              </span>
              <span className="min-w-0 flex-1 text-left text-base font-semibold">
                {pending ? 'Guardando…' : 'Guardar cambios'}
              </span>
              <span className="shrink-0 text-base font-semibold">
                {formatCurrency(previewTotals.total)}
              </span>
              <ChevronRightIcon className="size-5 shrink-0 opacity-80" aria-hidden="true" />
            </button>
          </div>
        </form>
      </aside>
    </>
  )
}
