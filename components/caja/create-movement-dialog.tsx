'use client'

import { useActionState } from 'react'
import {
  createFinancialMovementAction,
  type FinancialMovementFormState,
} from '@/lib/actions/financial-movement-actions'
import type { FinancialMovementType } from '@/lib/data/financial-movement-types'
import { useFormActionSuccess } from '@/lib/hooks/use-form-action-success'
import { Button } from '@/styles/catalyst-ui-kit/button'
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '@/styles/catalyst-ui-kit/dialog'
import { Field, FieldGroup, Fieldset, Label } from '@/styles/catalyst-ui-kit/fieldset'
import { Input } from '@/styles/catalyst-ui-kit/input'
import { Select } from '@/styles/catalyst-ui-kit/select'
import { Text } from '@/styles/catalyst-ui-kit/text'

const initialState: FinancialMovementFormState = { error: null, ok: false }

interface CreateMovementDialogProps {
  orgSlug: string
  open: boolean
  defaultDate: string
  defaultType?: FinancialMovementType
  onClose: () => void
}

export function CreateMovementDialog({
  orgSlug,
  open,
  defaultDate,
  defaultType = 'income',
  onClose,
}: CreateMovementDialogProps) {
  const boundAction = createFinancialMovementAction.bind(null, orgSlug)
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  useFormActionSuccess(state.ok, onClose, pending)

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogTitle>Nuevo movimiento</DialogTitle>
      <DialogDescription>
        Registra un ingreso o egreso manual para el balance del día.
      </DialogDescription>

      <form action={formAction} key={`${open}-${defaultType}`}>
        <DialogBody>
          <Fieldset>
            <FieldGroup>
              <Field>
                <Label htmlFor="movement-type">Tipo</Label>
                <Select id="movement-type" name="movementType" defaultValue={defaultType}>
                  <option value="income">Ingreso</option>
                  <option value="expense">Egreso</option>
                </Select>
              </Field>
              <Field>
                <Label htmlFor="movement-concept">Concepto</Label>
                <Input
                  id="movement-concept"
                  name="concept"
                  required
                  minLength={2}
                  placeholder="Ej. Pago de servicios"
                />
              </Field>
              <Field>
                <Label htmlFor="movement-amount">Monto</Label>
                <Input
                  id="movement-amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="0.00"
                />
              </Field>
              <Field>
                <Label htmlFor="movement-date">Fecha</Label>
                <Input
                  id="movement-date"
                  name="movementDate"
                  type="date"
                  required
                  defaultValue={defaultDate}
                />
              </Field>
              <Field>
                <Label htmlFor="movement-method">Método de pago</Label>
                <Select id="movement-method" name="paymentMethod" defaultValue="cash">
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="transfer">Transferencia</option>
                  <option value="other">Otro</option>
                </Select>
              </Field>
              <Field>
                <Label htmlFor="movement-reference">Referencia (opcional)</Label>
                <Input
                  id="movement-reference"
                  name="reference"
                  placeholder="Folio, comprobante, etc."
                />
              </Field>
            </FieldGroup>

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
          <Button type="submit" color="dark/zinc" disabled={pending}>
            {pending ? 'Guardando…' : 'Registrar movimiento'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
