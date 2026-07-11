'use client'

import { useActionState } from 'react'
import { voidSaleAction } from '@/lib/actions/sale-actions'
import type { SaleDetail } from '@/lib/data/sale-detail-types'
import { useFormActionSuccess } from '@/lib/hooks/use-form-action-success'
import type { SaleActionState } from '@/lib/pos/sale-types'
import { Button } from '@/styles/catalyst-ui-kit/button'
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertTitle,
} from '@/styles/catalyst-ui-kit/alert'
import { Field, Label } from '@/styles/catalyst-ui-kit/fieldset'
import { Input } from '@/styles/catalyst-ui-kit/input'
import { Text } from '@/styles/catalyst-ui-kit/text'

const initialState: SaleActionState = { error: null, ok: false }

interface VoidSaleDialogProps {
  orgSlug: string
  sale: SaleDetail | null
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function VoidSaleDialog ({
  orgSlug,
  sale,
  open,
  onClose,
  onSuccess,
}: VoidSaleDialogProps) {
  const boundAction = sale ? voidSaleAction.bind(null, orgSlug, sale.id) : null
  const [state, formAction, pending] = useActionState(
    boundAction ?? (async () => initialState),
    initialState
  )

  useFormActionSuccess(
    state.ok,
    onSuccess ?? onClose,
    pending,
    'Venta anulada correctamente.'
  )

  if (!sale || !boundAction) return null

  return (
    <Alert open={open} onClose={onClose} size="md">
      <AlertTitle>Anular venta</AlertTitle>
      <AlertDescription>
        ¿Seguro que deseas anular la venta <strong>#{sale.displayNumber}</strong>? Se restaurará
        el inventario de los productos vendidos. Esta acción no se puede deshacer.
      </AlertDescription>

      <form action={formAction}>
        <Field className="mt-4">
          <Label htmlFor="void-sale-reason">Motivo (opcional)</Label>
          <Input
            id="void-sale-reason"
            name="voidReason"
            placeholder="Ej. Error de captura, devolución…"
            disabled={pending}
          />
        </Field>

        {state.error ? (
          <Text
            className="mt-4 rounded-lg border border-red-500/30 bg-red-50 px-4 py-3 text-red-800! dark:bg-red-950/40 dark:text-red-200!"
            role="alert"
          >
            {state.error}
          </Text>
        ) : null}

        <AlertActions>
          <Button type="button" plain onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" color="red" disabled={pending}>
            {pending ? 'Anulando…' : 'Anular venta'}
          </Button>
        </AlertActions>
      </form>
    </Alert>
  )
}
