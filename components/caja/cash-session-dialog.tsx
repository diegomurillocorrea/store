'use client'

import { useActionState } from 'react'
import {
  closeCashSessionAction,
  openCashSessionAction,
  type CashActionState,
} from '@/lib/actions/cash-actions'
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
import { Text } from '@/styles/catalyst-ui-kit/text'
import type { CashSessionSummary } from '@/lib/data/balance-types'
import { formatCurrency } from '@/lib/utils/money'

const initialCashState: CashActionState = { error: null, ok: false }

interface CashSessionDialogProps {
  orgSlug: string
  open: boolean
  mode: 'open' | 'close'
  session: CashSessionSummary | null
  onClose: () => void
}

export function CashSessionDialog({
  orgSlug,
  open,
  mode,
  session,
  onClose,
}: CashSessionDialogProps) {
  const openAction = openCashSessionAction.bind(null, orgSlug)
  const closeAction = closeCashSessionAction.bind(null, orgSlug)
  const [openState, openFormAction, openPending] = useActionState(openAction, initialCashState)
  const [closeState, closeFormAction, closePending] = useActionState(closeAction, initialCashState)

  const isOpenMode = mode === 'open'
  const state = isOpenMode ? openState : closeState
  const pending = isOpenMode ? openPending : closePending

  useFormActionSuccess(state.ok, onClose, pending)

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogTitle>{isOpenMode ? 'Abrir caja' : 'Cerrar caja'}</DialogTitle>
      <DialogDescription>
        {isOpenMode
          ? 'Registra el monto inicial con el que abres la caja del día.'
          : 'Cuenta el efectivo en caja e ingresa el monto total para cerrar la sesión.'}
      </DialogDescription>

      <form action={isOpenMode ? openFormAction : closeFormAction}>
        <DialogBody>
          <Fieldset>
            <FieldGroup>
              <Field>
                <Label htmlFor="cash-amount">
                  {isOpenMode ? 'Monto de apertura' : 'Monto en caja'}
                </Label>
                <Input
                  id="cash-amount"
                  name={isOpenMode ? 'openingAmount' : 'closingAmount'}
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={isOpenMode ? '0' : ''}
                  placeholder="0.00"
                />
              </Field>
              {!isOpenMode && session ? (
                <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                  Monto de apertura: {formatCurrency(session.openingAmount)}
                </Text>
              ) : null}
              <Field>
                <Label htmlFor="cash-notes">Notas (opcional)</Label>
                <Input
                  id="cash-notes"
                  name="notes"
                  placeholder="Observaciones sobre la sesión"
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
            {pending ? 'Guardando…' : isOpenMode ? 'Abrir caja' : 'Cerrar caja'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
