'use client'

import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { CustomerOptionCombobox } from '@/components/pos/customer-option-combobox'
import { PosSaleConfirmDialog } from '@/components/pos/pos-sale-confirm-dialog'
import type { CustomerRow } from '@/lib/data/customer-types'
import { completePosSaleAction } from '@/lib/actions/sale-actions'
import type { PosCartLine } from '@/lib/pos/cart-types'
import {
  calculateSaleTotals,
  POS_PAYMENT_METHOD_LABELS,
  type PosPaymentMethod,
  type PosSaleType,
} from '@/lib/pos/sale-types'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Subheading } from '@/styles/catalyst-ui-kit/heading'
import { Field, FieldGroup, Label } from '@/styles/catalyst-ui-kit/fieldset'
import { Input } from '@/styles/catalyst-ui-kit/input'
import { Radio, RadioField, RadioGroup } from '@/styles/catalyst-ui-kit/radio'
import { Select } from '@/styles/catalyst-ui-kit/select'
import { Switch, SwitchField } from '@/styles/catalyst-ui-kit/switch'
import { Text } from '@/styles/catalyst-ui-kit/text'

const PAID_PAYMENT_METHODS = ['cash', 'card', 'transfer', 'other'] as const

type PaidPaymentMethod = (typeof PAID_PAYMENT_METHODS)[number]

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

export function PosCheckoutPanel({
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
  const [hasDiscount, setHasDiscount] = useState(false)
  const [discountPercentRaw, setDiscountPercentRaw] = useState('')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const discountPercent = useMemo(() => {
    if (!hasDiscount) return 0
    const parsed = Number.parseFloat(discountPercentRaw)
    if (!Number.isFinite(parsed)) return 0
    return Math.min(100, Math.max(0, parsed))
  }, [discountPercentRaw, hasDiscount])

  const { discountAmount, total } = useMemo(
    () => calculateSaleTotals(subtotal, discountPercent),
    [discountPercent, subtotal]
  )

  const isCashPayment = saleType === 'paid' && paymentMethod === 'cash'

  const requiresCustomer = saleType === 'credit'
  const canSell =
    cartLines.length > 0 &&
    total > 0 &&
    (!requiresCustomer || customerId !== null)

  function handleOpenConfirm() {
    if (!canSell) return
    setError(null)
    setConfirmOpen(true)
  }

  async function handleConfirmSale(amountTendered: number) {
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
    })

    setPending(false)

    if (!result.ok) {
      setError(result.error ?? 'No se pudo completar la venta.')
      return
    }

    setConfirmOpen(false)
    router.refresh()
    onSaleComplete()
  }

  return (
    <div className={clsx('flex h-full min-h-0 flex-col', className)}>
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-4 sm:px-6 lg:px-8 dark:border-zinc-800">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Volver al carrito"
        >
          <ArrowLeftIcon className="size-5" aria-hidden="true" />
        </button>
        <Subheading level={3}>Cobro</Subheading>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
        <FieldGroup className="space-y-6">
          <Field>
            <Label>Tipo de venta</Label>
            <RadioGroup
              value={saleType}
              onChange={(value) => setSaleType(value as PosSaleType)}
              className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              <RadioField>
                <Radio value="paid" color="emerald" />
                <Label>Venta pagada</Label>
              </RadioField>
              <RadioField>
                <Radio value="credit" color="emerald" />
                <Label>Al crédito</Label>
              </RadioField>
            </RadioGroup>
          </Field>

          {saleType === 'paid' ? (
            <Field>
              <Label htmlFor="pos-payment-method">Método de pago</Label>
              <Select
                id="pos-payment-method"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as PaidPaymentMethod)}
              >
                {PAID_PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {POS_PAYMENT_METHOD_LABELS[method]}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">
              La venta se registrará como cuenta por cobrar del cliente.
            </Text>
          )}

          <SwitchField>
            <Label>¿Aplicar descuento?</Label>
            <Switch
              color="emerald"
              checked={hasDiscount}
              onChange={setHasDiscount}
            />
          </SwitchField>

          {hasDiscount ? (
            <div className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
              <Field>
                <Label htmlFor="pos-discount-percent">Porcentaje de descuento</Label>
                <Input
                  id="pos-discount-percent"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step="0.01"
                  value={discountPercentRaw}
                  onChange={(event) => setDiscountPercentRaw(event.target.value)}
                  placeholder="Ej. 10"
                />
              </Field>
              <div className="flex items-center justify-between text-sm">
                <Text>Descuento</Text>
                <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                  −{formatCurrency(discountAmount)}
                </span>
              </div>
            </div>
          ) : null}

          <CustomerOptionCombobox
            id="pos-sale-customer"
            customers={customers}
            value={customerId}
            onChange={setCustomerId}
            label={requiresCustomer ? 'Cliente' : 'Cliente (opcional)'}
          />
        </FieldGroup>
      </div>

      <div className="mt-auto border-t border-zinc-200 px-4 py-4 sm:px-6 lg:px-8 dark:border-zinc-800">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <Text>Subtotal</Text>
            <span className="tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
          {hasDiscount && discountAmount > 0 ? (
            <div className="flex items-center justify-between text-sm">
              <Text>Descuento ({discountPercent}%)</Text>
              <span className="tabular-nums text-red-600 dark:text-red-400">
                −{formatCurrency(discountAmount)}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <Text className="font-medium">Total</Text>
            <span className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        <Button
          type="button"
          color="dark/zinc"
          className="mt-4 w-full"
          disabled={!canSell}
          onClick={handleOpenConfirm}
        >
          Vender
        </Button>

        {requiresCustomer && !customerId ? (
          <Text className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Selecciona un cliente para ventas al crédito.
          </Text>
        ) : null}
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
