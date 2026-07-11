'use client'

import { useActionState, useEffect, useState } from 'react'
import { CustomerOptionCombobox } from '@/components/pos/customer-option-combobox'
import { updateSaleAction } from '@/lib/actions/sale-actions'
import type { CustomerRow } from '@/lib/data/customer-types'
import type { SaleDetail } from '@/lib/data/sale-detail-types'
import { useFormActionSuccess } from '@/lib/hooks/use-form-action-success'
import {
  POS_PAYMENT_METHOD_LABELS,
  type PosPaymentMethod,
  type SaleActionState,
} from '@/lib/pos/sale-types'
import { Button } from '@/styles/catalyst-ui-kit/button'
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '@/styles/catalyst-ui-kit/dialog'
import { Field, FieldGroup, Fieldset, Label } from '@/styles/catalyst-ui-kit/fieldset'
import { Select } from '@/styles/catalyst-ui-kit/select'
import { Text } from '@/styles/catalyst-ui-kit/text'

const initialState: SaleActionState = { error: null, ok: false }

const paidMethods = Object.keys(POS_PAYMENT_METHOD_LABELS) as Array<
  Exclude<PosPaymentMethod, 'credit'>
>

interface EditSaleDialogProps {
  orgSlug: string
  sale: SaleDetail | null
  customers: CustomerRow[]
  open: boolean
  onClose: () => void
  onSuccess?: () => void
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

export function EditSaleDialog ({
  orgSlug,
  sale,
  customers,
  open,
  onClose,
  onSuccess,
}: EditSaleDialogProps) {
  const boundAction = sale ? updateSaleAction.bind(null, orgSlug, sale.id) : null
  const [state, formAction, pending] = useActionState(
    boundAction ?? (async () => initialState),
    initialState
  )
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('cash')

  useEffect(() => {
    if (!open || !sale) return
    setCustomerId(sale.customerId)
    setPaymentMethod(resolveInitialPaymentMethod(sale))
  }, [open, sale])

  useFormActionSuccess(
    state.ok,
    onSuccess ?? onClose,
    pending,
    'Venta actualizada correctamente.'
  )

  if (!sale || !boundAction) return null

  const isCredit = paymentMethod === 'credit'

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogTitle>Editar venta</DialogTitle>
      <DialogDescription>
        Actualiza el cliente o el método de pago de la venta <strong>#{sale.displayNumber}</strong>.
      </DialogDescription>

      <form action={formAction} key={`${sale.id}-${open}`}>
        <DialogBody>
          <Fieldset disabled={pending}>
            <FieldGroup>
              <input type="hidden" name="customerId" value={customerId ?? ''} />
              <CustomerOptionCombobox
                id="edit-sale-customer"
                customers={customers}
                value={customerId}
                onChange={setCustomerId}
                label={isCredit ? 'Cliente' : 'Cliente (opcional)'}
                disabled={pending}
              />

              <Field>
                <Label htmlFor="edit-sale-payment-method">Método de pago</Label>
                <Select
                  id="edit-sale-payment-method"
                  name="paymentMethod"
                  value={paymentMethod}
                  onChange={(event) => {
                    const next = event.target.value as PosPaymentMethod
                    setPaymentMethod(next)
                  }}
                >
                  {paidMethods.map((method) => (
                    <option key={method} value={method}>
                      {POS_PAYMENT_METHOD_LABELS[method]}
                    </option>
                  ))}
                  <option value="credit">Crédito</option>
                </Select>
              </Field>
            </FieldGroup>

            {isCredit && !customerId ? (
              <Text className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                Selecciona un cliente para ventas al crédito.
              </Text>
            ) : null}

            {state.error ? (
              <Text
                className="mt-4 rounded-lg border border-red-500/30 bg-red-50 px-4 py-3 text-red-800! dark:bg-red-950/40 dark:text-red-200!"
                role="alert"
              >
                {state.error}
              </Text>
            ) : null}
          </Fieldset>
        </DialogBody>

        <DialogActions>
          <Button type="button" plain onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" color="dark/zinc" disabled={pending || (isCredit && !customerId)}>
            {pending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
