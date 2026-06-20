'use client'

import { useActionState } from 'react'
import {
  deleteSupplierAction,
  type SupplierFormState,
} from '@/lib/actions/supplier-actions'
import { useFormActionSuccess } from '@/lib/hooks/use-form-action-success'
import type { SupplierRow } from '@/lib/data/suppliers'
import { Button } from '@/styles/catalyst-ui-kit/button'
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertTitle,
} from '@/styles/catalyst-ui-kit/alert'
import { Text } from '@/styles/catalyst-ui-kit/text'

const initialState: SupplierFormState = { error: null, ok: false }

interface DeleteSupplierDialogProps {
  orgSlug: string
  supplier: SupplierRow | null
  open: boolean
  onClose: () => void
}

export function DeleteSupplierDialog({
  orgSlug,
  supplier,
  open,
  onClose,
}: DeleteSupplierDialogProps) {
  const boundAction = supplier
    ? deleteSupplierAction.bind(null, orgSlug, supplier.id)
    : null
  const [state, formAction, pending] = useActionState(
    boundAction ?? (async () => initialState),
    initialState
  )

  useFormActionSuccess(state.ok, onClose)

  if (!supplier || !boundAction) return null

  return (
    <Alert open={open} onClose={onClose} size="md">
      <AlertTitle>Eliminar proveedor</AlertTitle>
      <AlertDescription>
        ¿Seguro que deseas eliminar <strong>{supplier.name}</strong>? Esta acción no se puede
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
