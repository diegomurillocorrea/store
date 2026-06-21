'use client'

import { useActionState } from 'react'
import {
  updateEmployeeAction,
  type EmployeeFormState,
} from '@/lib/actions/employee-actions'
import { EmployeeFormFields } from '@/components/empleados/employee-form-fields'
import { useFormActionSuccess } from '@/lib/hooks/use-form-action-success'
import {
  getEmployeeFullName,
  getLockedPropietarioRole,
  type EmployeeRow,
} from '@/lib/data/employee-types'
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

interface EditEmployeeDialogProps {
  orgSlug: string
  assignableRoles: RoleOption[]
  propietarioRole: RoleOption | null
  employee: EmployeeRow | null
  open: boolean
  onClose: () => void
}

export function EditEmployeeDialog({
  orgSlug,
  assignableRoles = [],
  propietarioRole,
  employee,
  open,
  onClose,
}: EditEmployeeDialogProps) {
  const boundAction = employee
    ? updateEmployeeAction.bind(null, orgSlug, employee.id)
    : null
  const [state, formAction, pending] = useActionState(
    boundAction ?? (async () => initialState),
    initialState
  )

  useFormActionSuccess(state.ok, onClose, pending)

  if (!employee || !boundAction) return null

  const fullName = getEmployeeFullName(employee)
  const lockedRole = getLockedPropietarioRole(employee, propietarioRole)

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogTitle>Editar empleado</DialogTitle>
      <DialogDescription>
        Modifica la información de <strong>{fullName}</strong>.
      </DialogDescription>

      <form action={formAction} key={employee.id}>
        <DialogBody>
          <EmployeeFormFields
            assignableRoles={assignableRoles}
            lockedRole={lockedRole}
            defaultFirstName={employee.firstName}
            defaultLastName={employee.lastName}
            defaultPhone={employee.phone}
            defaultEmail={employee.email}
            defaultStatus={employee.status}
            defaultRoleId={employee.roleId}
            formKey={employee.id}
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
            {pending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
