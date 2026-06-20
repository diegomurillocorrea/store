'use client'

import { useActionState } from 'react'
import {
  deleteCustomerAction,
  type CustomerFormState,
} from '@/lib/actions/customer-actions'
import { useFormActionSuccess } from '@/lib/hooks/use-form-action-success'
import { getCustomerFullName, type CustomerRow } from '@/lib/data/customer-types'
import { Button } from '@/styles/catalyst-ui-kit/button'
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertTitle,
} from '@/styles/catalyst-ui-kit/alert'
import { Text } from '@/styles/catalyst-ui-kit/text'

const initialState: CustomerFormState = { error: null, ok: false }

interface DeleteCustomerDialogProps {
  orgSlug: string
  customer: CustomerRow | null
  open: boolean
  onClose: () => void
}

export function DeleteCustomerDialog({
  orgSlug,
  customer,
  open,
  onClose,
}: DeleteCustomerDialogProps) {
  const boundAction = customer
    ? deleteCustomerAction.bind(null, orgSlug, customer.id)
    : null
  const [state, formAction, pending] = useActionState(
    boundAction ?? (async () => initialState),
    initialState
  )

  useFormActionSuccess(state.ok, onClose, pending)

  if (!customer || !boundAction) return null

  const fullName = getCustomerFullName(customer)

  return (
    <Alert open={open} onClose={onClose} size="md">
      <AlertTitle>Eliminar cliente</AlertTitle>
      <AlertDescription>
        ¿Seguro que deseas eliminar a <strong>{fullName}</strong>? Esta acción no se puede
        deshacer.
      </AlertDescription>

      {state.error ? (
        <Text
          className="mt-4 rounded-lg border border-red-500/30 bg-red-50 px-4 py-3 !text-red-800 dark:bg-red-950/40 dark:!text-red-200"
          role="alert"
        >
          {state.error}
        </Text>
      ) : null}

      <form action={formAction}>
        <AlertActions>
          <Button type="button" plain onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" color="red" disabled={pending}>
            {pending ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </AlertActions>
      </form>
    </Alert>
  )
}
