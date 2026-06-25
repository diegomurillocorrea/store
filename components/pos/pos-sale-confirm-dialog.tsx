'use client'

import { useEffect, useMemo, useState } from 'react'
import { calculateChange, roundMoney } from '@/lib/pos/sale-types'
import { Button } from '@/styles/catalyst-ui-kit/button'
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '@/styles/catalyst-ui-kit/dialog'
import { Field, Label } from '@/styles/catalyst-ui-kit/fieldset'
import { Input } from '@/styles/catalyst-ui-kit/input'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface PosSaleConfirmDialogProps {
  open: boolean
  total: number
  isCashPayment: boolean
  isCreditSale: boolean
  pending: boolean
  error: string | null
  onClose: () => void
  onConfirm: (amountTendered: number) => void
  formatCurrency: (value: number) => string
}

export function PosSaleConfirmDialog({
  open,
  total,
  isCashPayment,
  isCreditSale,
  pending,
  error,
  onClose,
  onConfirm,
  formatCurrency,
}: PosSaleConfirmDialogProps) {
  const [amountPaidRaw, setAmountPaidRaw] = useState('')

  useEffect(() => {
    if (!open) {
      setAmountPaidRaw('')
      return
    }

    if (isCreditSale) {
      setAmountPaidRaw('0')
      return
    }

    if (!isCashPayment) {
      setAmountPaidRaw(String(total))
    }
  }, [open, isCashPayment, isCreditSale, total])

  const amountPaid = useMemo(() => {
    const parsed = Number.parseFloat(amountPaidRaw)
    return Number.isFinite(parsed) ? parsed : 0
  }, [amountPaidRaw])

  const hasEnteredAmount = amountPaidRaw.trim().length > 0
  const enteredAmountIsInsufficient = hasEnteredAmount && amountPaid < total

  const changeAmount = useMemo(() => {
    if (isCreditSale || !isCashPayment) return 0
    if (!hasEnteredAmount) return 0
    return calculateChange(amountPaid, total)
  }, [amountPaid, hasEnteredAmount, isCashPayment, isCreditSale, total])

  const canConfirm = !enteredAmountIsInsufficient

  function handleClose() {
    if (pending) return
    onClose()
  }

  function handleConfirm() {
    if (!canConfirm || pending) return

    if (isCreditSale) {
      onConfirm(0)
      return
    }

    if (!isCashPayment) {
      onConfirm(total)
      return
    }

    const amountTendered = hasEnteredAmount ? roundMoney(amountPaid) : total
    onConfirm(amountTendered)
  }

  return (
    <Dialog open={open} onClose={handleClose} size="md">
      <DialogTitle>Calcula el cambio de tu venta</DialogTitle>
      <DialogDescription>
        Revisa el total y, si aplica, indica con cuánto paga tu cliente. Si pagó el monto
        exacto, confirma directamente.
      </DialogDescription>

      <DialogBody>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
            <Text>Valor de la venta</Text>
            <span className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatCurrency(total)}
            </span>
          </div>

          <Field>
            <Label htmlFor="pos-amount-paid">¿Con cuánto paga tu cliente? (opcional)</Label>
            <Input
              id="pos-amount-paid"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={amountPaidRaw}
              onChange={(event) => setAmountPaidRaw(event.target.value)}
              placeholder="0.00"
              autoComplete="off"
              readOnly={!isCashPayment}
              disabled={isCreditSale}
            />
          </Field>

          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <Text className="font-medium text-emerald-900 dark:text-emerald-200">
              Valor a devolver
            </Text>
            <span className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
              {formatCurrency(changeAmount)}
            </span>
          </div>

          {isCashPayment && enteredAmountIsInsufficient ? (
            <Text className="text-sm text-red-600 dark:text-red-400">
              El monto pagado debe ser mayor o igual al total ({formatCurrency(total)}).
            </Text>
          ) : null}

          {error ? (
            <Text className="rounded-lg border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </Text>
          ) : null}
        </div>
      </DialogBody>

      <DialogActions>
        <Button type="button" color="light" onClick={handleClose} disabled={pending}>
          Cancelar
        </Button>
        <Button
          type="button"
          color="dark/zinc"
          onClick={handleConfirm}
          disabled={!canConfirm || pending}
        >
          {pending ? 'Confirmando…' : 'Confirmar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
