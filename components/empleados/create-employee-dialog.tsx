'use client'

import { useActionState } from 'react'
import {
  createEmployeeAction,
  type EmployeeFormState,
} from '@/lib/actions/employee-actions'
import { EmployeeFormFields } from '@/components/empleados/employee-form-fields'
import { useFormActionSuccess } from '@/lib/hooks/use-form-action-success'
import type { RoleOption } from '@/lib/data/roles'
import { Button } from '@/styles/catalyst-ui-kit/button'
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '@/styles/catalyst-ui-kit/dialog'
import { Text } from '@/styles/catalyst-ui-kit/text'

const initialState: EmployeeFormState = { error: null, ok: false }

interface CreateEmployeeDialogProps {
  orgSlug: string
  assignableRoles: RoleOption[]
  open: boolean
  onClose: () => void
}

export function CreateEmployeeDialog({
  orgSlug,
  assignableRoles = [],
  open,
  onClose,
}: CreateEmployeeDialogProps) {
  const boundAction = createEmployeeAction.bind(null, orgSlug)
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  useFormActionSuccess(state.ok, onClose, pending)

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogTitle>Nuevo empleado</DialogTitle>
      <DialogDescription>
        Registra un empleado con su información de contacto, estado y rol.
      </DialogDescription>

      <form action={formAction}>
        <DialogBody>
          <EmployeeFormFields
            assignableRoles={assignableRoles}
            formKey={open ? 'create' : 'closed'}
          />

          {state.error ? (
            <Text
              className="mt-4 rounded-lg border border-red-500/30 bg-red-50 px-4 py-3 text-red-800! dark:bg-red-950/40 dark:text-red-200!"
              role="alert"
            >
              {state.error}
            </Text>
          ) : null}
        </DialogBody>

        <DialogActions>
          <Button type="button" plain onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" color="dark/zinc" disabled={pending}>
            {pending ? 'Guardando…' : 'Crear empleado'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
