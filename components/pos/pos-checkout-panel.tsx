'use client'

import {
  ArrowLeftIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CreditCardIcon,
  PrinterIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { CustomerOptionCombobox } from '@/components/pos/customer-option-combobox'
import { PosSaleConfirmDialog } from '@/components/pos/pos-sale-confirm-dialog'
import type { CustomerRow } from '@/lib/data/customer-types'
import { completePosSaleAction } from '@/lib/actions/sale-actions'
import {
  getCartItemCount,
  type PosCartLine,
} from '@/lib/pos/cart-types'
import {
  calculateSaleTotals,
  POS_PAYMENT_METHOD_LABELS,
  roundMoney,
  type PosSaleType,
} from '@/lib/pos/sale-types'
import { Text } from '@/styles/catalyst-ui-kit/text'
import { Textarea } from '@/styles/catalyst-ui-kit/textarea'

const PAID_PAYMENT_METHODS = ['cash', 'card', 'transfer', 'other'] as const

type PaidPaymentMethod = (typeof PAID_PAYMENT_METHODS)[number]

const PAYMENT_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6] as const

const paymentMethodMeta: Record<
  PaidPaymentMethod,
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

interface PosCheckoutPanelProps {
  orgSlug: string
  cartLines: PosCartLine[]
  subtotal: number
  customers: CustomerRow[]
  onBack: () => void
  onSaleComplete: () => void
  formatCurrency: (value: number) => string
  className?: string
}

function toDateInputValue (date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatSaleDateLabel (value: string): string {
  if (!value) return ''
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
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

function PaymentMethodCard ({
  method,
  selected,
  disabled,
  onSelect,
}: {
  method: PaidPaymentMethod
  selected: boolean
  disabled?: boolean
  onSelect: (method: PaidPaymentMethod) => void
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
        'relative flex min-h-28 flex-col items-center justify-center gap-2.5 rounded-xl border px-3 py-4 text-center transition',
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

export function PosCheckoutPanel ({
  orgSlug,
  cartLines,
  subtotal,
  customers,
  onBack,
  onSaleComplete,
  formatCurrency,
  className = '',
}: PosCheckoutPanelProps) {
  const router = useRouter()
  const [saleType, setSaleType] = useState<PosSaleType>('paid')
  const [paymentMethod, setPaymentMethod] = useState<PaidPaymentMethod>('cash')
  const [paymentCount, setPaymentCount] = useState<number>(1)
  const [customPaymentCountRaw, setCustomPaymentCountRaw] = useState('')
  const [isCustomPaymentCount, setIsCustomPaymentCount] = useState(false)
  const [saleDate, setSaleDate] = useState(() => toDateInputValue())
  const [discountPercent, setDiscountPercent] = useState(0)
  const [discountPercentInput, setDiscountPercentInput] = useState('0')
  const [discountAmountInput, setDiscountAmountInput] = useState('0')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [saleConcept, setSaleConcept] = useState('')
  const [receiptNote, setReceiptNote] = useState('')
  const [showReceiptDetails, setShowReceiptDetails] = useState(true)
  const [showPaymentDetail, setShowPaymentDetail] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const itemCount = useMemo(() => getCartItemCount(cartLines), [cartLines])

  const { discountAmount, total } = useMemo(
    () => calculateSaleTotals(subtotal, discountPercent),
    [discountPercent, subtotal]
  )

  const isPaid = saleType === 'paid'
  const isCashPayment = isPaid && paymentMethod === 'cash'
  const requiresCustomer = saleType === 'credit'
  const canSell =
    cartLines.length > 0 &&
    total > 0 &&
    Boolean(saleDate) &&
    (!requiresCustomer || customerId !== null)

  function applyDiscountPercent (nextPercent: number) {
    const safePercent = Math.min(100, Math.max(0, nextPercent))
    const totals = calculateSaleTotals(subtotal, safePercent)
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
    setDiscountAmountInput(raw)
    if (raw.trim() === '' || raw.endsWith('.') || raw.endsWith(',')) return

    const nextAmount = Math.min(subtotal, Math.max(0, parseDiscountNumber(raw)))
    const nextPercent = subtotal > 0 ? roundMoney((nextAmount / subtotal) * 100) : 0
    const totals = calculateSaleTotals(subtotal, nextPercent)
    setDiscountPercent(nextPercent)
    setDiscountPercentInput(formatDiscountPercentDisplay(nextPercent))
    setDiscountAmountInput(formatDiscountAmountDisplay(totals.discountAmount))
  }

  function commitDiscountInputs () {
    applyDiscountPercent(parseDiscountNumber(discountPercentInput))
  }

  function selectPaymentCount (count: number) {
    setIsCustomPaymentCount(false)
    setCustomPaymentCountRaw('')
    setPaymentCount(count)
  }

  function selectCustomPaymentCount () {
    setIsCustomPaymentCount(true)
    const parsed = Number.parseInt(customPaymentCountRaw, 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      setPaymentCount(parsed)
    }
  }

  function handleOpenConfirm () {
    if (!canSell || pending) return
    setError(null)
    setConfirmOpen(true)
  }

  async function handleConfirmSale (amountTendered: number) {
    if (requiresCustomer && !customerId) return

    setPending(true)
    setError(null)

    const result = await completePosSaleAction(orgSlug, {
      lines: cartLines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
      customerId,
      saleType,
      paymentMethod: saleType === 'credit' ? 'credit' : paymentMethod,
      discountPercent,
      amountTendered: isCashPayment ? amountTendered : null,
      saleDate,
    })

    setPending(false)

    if (!result.ok) {
      setError(result.error ?? 'No se pudo completar la venta.')
      return
    }

    setConfirmOpen(false)
    onSaleComplete()
    router.push(`/${orgSlug}/caja`)
  }

  return (
    <div className={clsx('flex h-full min-h-0 flex-col', className)}>
      <div className="flex items-start gap-2 border-b border-zinc-200 px-4 py-4 sm:px-6 lg:px-8 dark:border-zinc-800">
        <button
          type="button"
          onClick={onBack}
          className="mt-0.5 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Volver al carrito"
        >
          <ArrowLeftIcon className="size-5" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Datos del pago
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Los campos marcados con asterisco (*) son obligatorios
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
        <div
          role="group"
          aria-label="Estado del pago"
          className="grid grid-cols-2 gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800/60"
        >
          <button
            type="button"
            onClick={() => setSaleType('paid')}
            aria-pressed={isPaid}
            className={clsx(
              'rounded-lg px-3 py-2.5 text-sm font-semibold transition',
              isPaid
                ? 'bg-emerald-600 text-white shadow-sm dark:bg-emerald-500'
                : 'text-zinc-600 hover:bg-white hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
            )}
          >
            Pagada
          </button>
          <button
            type="button"
            onClick={() => setSaleType('credit')}
            aria-pressed={!isPaid}
            className={clsx(
              'rounded-lg px-3 py-2.5 text-sm font-semibold transition',
              !isPaid
                ? 'bg-emerald-600 text-white shadow-sm dark:bg-emerald-500'
                : 'text-zinc-600 hover:bg-white hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
            )}
          >
            A crédito
          </button>
        </div>

        <div>
          <label
            htmlFor="pos-sale-date"
            className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Fecha de la venta <span className="text-emerald-600">*</span>
          </label>
          <div className="relative">
            <input
              id="pos-sale-date"
              type="date"
              value={saleDate}
              onChange={(event) => setSaleDate(event.target.value)}
              required
              disabled={pending}
              className="block w-full rounded-xl border border-zinc-200 bg-white py-3 pr-3.5 pl-3.5 text-sm text-zinc-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              aria-label={`Fecha de la venta: ${saleDate ? formatSaleDateLabel(saleDate) : ''}`}
            />
          </div>
        </div>

        {isPaid ? (
          <>
            <div>
              <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Selecciona el número de pagos que realizarás y el método de pago{' '}
                <span className="text-emerald-600">*</span>
              </p>
              <div
                role="group"
                aria-label="Número de pagos"
                className="flex flex-wrap gap-2"
              >
                {PAYMENT_COUNT_OPTIONS.map((count) => {
                  const isSelected = !isCustomPaymentCount && paymentCount === count
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => selectPaymentCount(count)}
                      aria-pressed={isSelected}
                      disabled={pending}
                      className={clsx(
                        'flex size-11 items-center justify-center rounded-xl border text-sm font-semibold transition',
                        isSelected
                          ? 'border-amber-400 bg-amber-300 text-zinc-900 dark:border-amber-500 dark:bg-amber-400'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600',
                        pending && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      {count}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={selectCustomPaymentCount}
                  aria-pressed={isCustomPaymentCount}
                  disabled={pending}
                  className={clsx(
                    'flex h-11 min-w-11 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition',
                    isCustomPaymentCount
                      ? 'border-amber-400 bg-amber-300 text-zinc-900 dark:border-amber-500 dark:bg-amber-400'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600',
                    pending && 'cursor-not-allowed opacity-50'
                  )}
                >
                  Otro
                </button>
              </div>

              {isCustomPaymentCount ? (
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={customPaymentCountRaw}
                  onChange={(event) => {
                    const raw = event.target.value
                    setCustomPaymentCountRaw(raw)
                    const parsed = Number.parseInt(raw, 10)
                    if (Number.isFinite(parsed) && parsed > 0) {
                      setPaymentCount(parsed)
                    }
                  }}
                  disabled={pending}
                  placeholder="Cantidad de pagos"
                  aria-label="Cantidad personalizada de pagos"
                  className="mt-3 block w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              ) : null}

              {paymentCount > 1 ? (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Por ahora la venta se registra con un solo pago por el total. El número de
                  pagos queda como referencia.
                </p>
              ) : null}
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Selecciona el método de pago <span className="text-emerald-600">*</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PAID_PAYMENT_METHODS.map((method) => (
                  <PaymentMethodCard
                    key={method}
                    method={method}
                    selected={paymentMethod === method}
                    disabled={pending}
                    onSelect={setPaymentMethod}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">
            La venta se registrará como cuenta por cobrar del cliente.
          </Text>
        )}

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

        <CustomerOptionCombobox
          id="pos-sale-customer"
          customers={customers}
          value={customerId}
          onChange={setCustomerId}
          label={requiresCustomer ? 'Cliente *' : 'Cliente'}
          placeholder="Selecciona un cliente"
          disabled={pending}
        />

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => setShowReceiptDetails((current) => !current)}
            aria-expanded={showReceiptDetails}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
          >
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Detalles del comprobante
            </span>
            <ChevronDownIcon
              className={clsx(
                'size-5 shrink-0 text-zinc-400 transition',
                showReceiptDetails && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </button>

          {showReceiptDetails ? (
            <div className="space-y-4 border-t border-zinc-200 px-4 py-4 dark:border-zinc-700">
              <div>
                <label
                  htmlFor="pos-sale-concept"
                  className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                >
                  Concepto
                </label>
                <input
                  id="pos-sale-concept"
                  type="text"
                  value={saleConcept}
                  onChange={(event) => setSaleConcept(event.target.value)}
                  placeholder="Dale un nombre a tu venta"
                  disabled={pending}
                  className="block w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="pos-sale-receipt-note"
                  className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                >
                  Nota del comprobante
                </label>
                <Textarea
                  id="pos-sale-receipt-note"
                  value={receiptNote}
                  onChange={(event) => setReceiptNote(event.target.value)}
                  placeholder="Agregar nota..."
                  rows={4}
                  disabled={pending}
                  className="rounded-xl!"
                />
              </div>
            </div>
          ) : null}
        </div>

        {requiresCustomer && !customerId ? (
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">
            Selecciona un cliente para ventas al crédito.
          </Text>
        ) : null}

        {error && !confirmOpen ? (
          <Text
            className="rounded-xl border border-red-500/30 bg-red-50 px-4 py-3 text-red-800! dark:bg-red-950/40 dark:text-red-200!"
            role="alert"
          >
            {error}
          </Text>
        ) : null}
      </div>

      <div className="mt-auto border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setShowPaymentDetail((current) => !current)}
          aria-expanded={showPaymentDetail}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-6 lg:px-8"
        >
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Detalle del pago
          </span>
          <ChevronDownIcon
            className={clsx(
              'size-5 shrink-0 text-zinc-400 transition',
              showPaymentDetail && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>

        {showPaymentDetail ? (
          <div className="space-y-1.5 border-t border-zinc-100 px-4 pb-3 sm:px-6 lg:px-8 dark:border-zinc-800">
            <div className="flex items-center justify-between text-sm">
              <Text>Subtotal</Text>
              <span className="tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatCurrency(subtotal)}
              </span>
            </div>
            {discountAmount > 0 ? (
              <div className="flex items-center justify-between text-sm">
                <Text>Descuento ({formatDiscountPercentDisplay(discountPercent)}%)</Text>
                <span className="tabular-nums text-red-600 dark:text-red-400">
                  −{formatCurrency(discountAmount)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-sm font-semibold">
              <Text className="font-semibold text-zinc-900! dark:text-zinc-100!">Total</Text>
              <span className="tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-3 px-4 pb-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={handleOpenConfirm}
            disabled={!canSell || pending}
            className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-zinc-300 bg-white text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            aria-label="Crear venta e imprimir"
            title="Crear venta"
          >
            <PrinterIcon className="size-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={handleOpenConfirm}
            disabled={!canSell || pending}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-zinc-900 px-4 py-3.5 text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-700 text-sm font-semibold dark:bg-zinc-300">
              {itemCount}
            </span>
            <span className="min-w-0 flex-1 text-left text-base font-semibold">
              {pending ? 'Creando…' : 'Crear venta'}
            </span>
            <span className="shrink-0 text-base font-semibold tabular-nums">
              {formatCurrency(total)}
            </span>
            <ChevronRightIcon className="size-5 shrink-0 opacity-80" aria-hidden="true" />
          </button>
        </div>
      </div>

      <PosSaleConfirmDialog
        open={confirmOpen}
        total={total}
        isCashPayment={isCashPayment}
        isCreditSale={saleType === 'credit'}
        pending={pending}
        error={error}
        onClose={() => {
          if (pending) return
          setConfirmOpen(false)
          setError(null)
        }}
        onConfirm={handleConfirmSale}
        formatCurrency={formatCurrency}
      />
    </div>
  )
}
