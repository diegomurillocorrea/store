'use client'

import { useActionState } from 'react'
import {
  deleteEmployeeAction,
  type EmployeeFormState,
} from '@/lib/actions/employee-actions'
import { useFormActionSuccess } from '@/lib/hooks/use-form-action-success'
import { getEmployeeFullName, type EmployeeRow } from '@/lib/data/employee-types'
import { Button } from '@/styles/catalyst-ui-kit/button'
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertTitle,
} from '@/styles/catalyst-ui-kit/alert'
import { Text } from '@/styles/catalyst-ui-kit/text'

const initialState: EmployeeFormState = { error: null, ok: false }

interface DeleteEmployeeDialogProps {
  orgSlug: string
  employee: EmployeeRow | null
  open: boolean
  onClose: () => void
}

export function DeleteEmployeeDialog({
  orgSlug,
  employee,
  open,
  onClose,
}: DeleteEmployeeDialogProps) {
  const boundAction = employee
    ? deleteEmployeeAction.bind(null, orgSlug, employee.id)
    : null
  const [state, formAction, pending] = useActionState(
    boundAction ?? (async () => initialState),
    initialState
  )

  useFormActionSuccess(state.ok, onClose, pending)

  if (!employee || !boundAction) return null

  const fullName = getEmployeeFullName(employee)

  return (
    <Alert open={open} onClose={onClose} size="md">
      <AlertTitle>Eliminar empleado</AlertTitle>
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
