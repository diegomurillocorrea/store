'use client'

import type { EmployeeStatus } from '@/lib/data/employee-types'
import { EMPLOYEE_STATUS_LABELS } from '@/lib/data/employee-types'
import type { RoleOption } from '@/lib/data/roles'
import { ProductOptionCombobox } from '@/components/productos/product-option-combobox'
import { PhoneInput } from '@/components/phone-input'
import { Field, FieldGroup, Fieldset, Label } from '@/styles/catalyst-ui-kit/fieldset'
import { Input } from '@/styles/catalyst-ui-kit/input'

interface EmployeeFormFieldsProps {
  assignableRoles?: RoleOption[]
  /** @deprecated Use assignableRoles */
  roles?: RoleOption[]
  lockedRole?: RoleOption | null
  defaultFirstName?: string
  defaultLastName?: string
  defaultPhone?: string | null
  defaultEmail?: string | null
  defaultStatus?: EmployeeStatus
  defaultRoleId?: string | null
  formKey?: string | number
}

export function EmployeeFormFields({
  assignableRoles: assignableRolesProp,
  roles,
  lockedRole = null,
  defaultFirstName = '',
  defaultLastName = '',
  defaultPhone = '',
  defaultEmail = '',
  defaultStatus = 'active',
  defaultRoleId = null,
  formKey,
}: EmployeeFormFieldsProps) {
  const assignableRoles = assignableRolesProp ?? roles ?? []

  return (
    <Fieldset>
      <FieldGroup>
        <Field>
          <Label htmlFor="employee-first-name">Nombres</Label>
          <Input
            id="employee-first-name"
            name="firstName"
            required
            minLength={2}
            autoComplete="given-name"
            placeholder="Ej. Juan Carlos"
            defaultValue={defaultFirstName}
          />
        </Field>
        <Field>
          <Label htmlFor="employee-last-name">Apellidos</Label>
          <Input
            id="employee-last-name"
            name="lastName"
            required
            minLength={2}
            autoComplete="family-name"
            placeholder="Ej. Pérez Ramírez"
            defaultValue={defaultLastName}
          />
        </Field>
        <PhoneInput
          id="employee-phone"
          defaultValue={defaultPhone}
          resetKey={formKey}
        />
        <Field>
          <Label htmlFor="employee-email">Correo electrónico</Label>
          <Input
            id="employee-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Ej. empleado@correo.com"
            defaultValue={defaultEmail ?? ''}
          />
        </Field>
        <Field>
          <Label htmlFor="employee-status">Estado</Label>
          <select
            id="employee-status"
            name="status"
            required
            defaultValue={defaultStatus}
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-white/5"
          >
            {(Object.entries(EMPLOYEE_STATUS_LABELS) as [EmployeeStatus, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </Field>
        {lockedRole ? (
          <input type="hidden" name="roleId" value={lockedRole.id} />
        ) : (
          <ProductOptionCombobox
            id="employee-role"
            name="roleId"
            label="Rol"
            options={assignableRoles.map(({ id, name }) => ({ id, name }))}
            defaultOptionId={defaultRoleId}
            emptyLabel="Sin rol asignado"
            resetKey={formKey}
          />
        )}
      </FieldGroup>
    </Fieldset>
  )
}
