'use client'

import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'
import { CreateEmployeeDialog } from '@/components/empleados/create-employee-dialog'
import { DeleteEmployeeDialog } from '@/components/empleados/delete-employee-dialog'
import { EditEmployeeDialog } from '@/components/empleados/edit-employee-dialog'
import {
  EMPLOYEE_STATUS_LABELS,
  getEmployeeFullName,
  type EmployeeRow,
} from '@/lib/data/employee-types'
import type { RoleOption } from '@/lib/data/roles'
import type { ViewActionFlags } from '@/lib/permissions/views'
import { formatPhoneLabel, formatPhoneTelHref } from '@/lib/utils/phone'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Input, InputGroup } from '@/styles/catalyst-ui-kit/input'
import { Subheading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface EmployeesPanelProps {
  orgSlug: string
  employees: EmployeeRow[]
  assignableRoles: RoleOption[]
  propietarioRole: RoleOption | null
  actions: Pick<ViewActionFlags, 'canCreate' | 'canEdit' | 'canDelete'>
}

function StatusBadge({ status }: { status: EmployeeRow['status'] }) {
  const isActive = status === 'active'

  return (
    <span
      className={
        isActive
          ? 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 ring-1 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300'
      }
    >
      {EMPLOYEE_STATUS_LABELS[status]}
    </span>
  )
}

export function EmployeesPanel({
  orgSlug,
  employees,
  assignableRoles = [],
  propietarioRole = null,
  actions,
}: EmployeesPanelProps) {
  const [query, setQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | null>(null)
  const [deletingEmployee, setDeletingEmployee] = useState<EmployeeRow | null>(null)

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return employees

    return employees.filter((employee) => {
      const haystack = [
        employee.firstName,
        employee.lastName,
        getEmployeeFullName(employee),
        employee.phone ?? '',
        employee.email ?? '',
        employee.roleName ?? '',
        EMPLOYEE_STATUS_LABELS[employee.status],
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [employees, query])

  const handleOpenCreate = () => setIsCreateOpen(true)
  const handleCloseCreate = () => setIsCreateOpen(false)
  const handleCloseEdit = () => setEditingEmployee(null)
  const handleCloseDelete = () => setDeletingEmployee(null)

  return (
    <>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <Subheading level={3}>Listado de empleados</Subheading>
          <Text className="mt-2 max-w-2xl">
            Personal de tu organización. Puedes buscar, crear, editar o eliminar.
          </Text>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          {actions.canCreate ? (
            <Button type="button" color="dark/zinc" onClick={handleOpenCreate}>
              <PlusIcon data-slot="icon" aria-hidden="true" />
              Nuevo empleado
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 max-w-md">
        <InputGroup>
          <MagnifyingGlassIcon data-slot="icon" aria-hidden="true" />
          <Input
            type="search"
            name="employee-search"
            placeholder="Buscar por nombre, teléfono, correo o rol"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar empleado"
          />
        </InputGroup>
      </div>

      {filteredEmployees.length === 0 ? (
        <div className="glass-surface mt-8 rounded-xl p-8 text-center sm:rounded-2xl">
          <Subheading level={3}>
            {employees.length === 0 ? 'Sin empleados' : 'Sin resultados'}
          </Subheading>
          <Text className="mt-2">
            {employees.length === 0
              ? 'Registra tu primer empleado con el botón de arriba.'
              : 'Prueba con otro término de búsqueda.'}
          </Text>
        </div>
      ) : (
        <div className="glass-surface mt-8 overflow-hidden rounded-xl sm:rounded-2xl">
          <div className="overflow-x-auto">
            <table className="relative min-w-full divide-y divide-border">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-foreground! sm:pl-6"
                  >
                    Nombres
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-foreground!"
                  >
                    Apellidos
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-foreground!"
                  >
                    Teléfono
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-foreground!"
                  >
                    Correo
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-foreground!"
                  >
                    Estado
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3.5 text-left text-sm font-semibold text-foreground! lg:table-cell"
                  >
                    Rol
                  </th>
                  <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-6">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEmployees.map((employee) => {
                  const fullName = getEmployeeFullName(employee)

                  return (
                    <tr key={employee.id}>
                      <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-foreground! sm:pl-6">
                        {employee.firstName}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-foreground!">
                        {employee.lastName}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-foreground!">
                        {employee.phone ? (
                          <a
                            href={formatPhoneTelHref(employee.phone) ?? undefined}
                            className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                          >
                            {formatPhoneLabel(employee.phone)}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-foreground!">
                        {employee.email ? (
                          <a
                            href={`mailto:${employee.email}`}
                            className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                          >
                            {employee.email}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap">
                        <StatusBadge status={employee.status} />
                      </td>
                      <td className="hidden px-3 py-4 text-sm whitespace-nowrap text-foreground! lg:table-cell">
                        {employee.roleName ?? '—'}
                      </td>
                      <td className="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                        {actions.canEdit || actions.canDelete ? (
                          <div className="flex items-center justify-end gap-4">
                            {actions.canEdit ? (
                              <button
                                type="button"
                                onClick={() => setEditingEmployee(employee)}
                                className="text-emerald-600 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:text-emerald-400 dark:hover:text-emerald-300"
                              >
                                Editar
                                <span className="sr-only">, {fullName}</span>
                              </button>
                            ) : null}
                            {actions.canDelete ? (
                              <button
                                type="button"
                                onClick={() => setDeletingEmployee(employee)}
                                className="text-red-600 hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Eliminar
                                <span className="sr-only">, {fullName}</span>
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateEmployeeDialog
        orgSlug={orgSlug}
        assignableRoles={assignableRoles}
        open={isCreateOpen}
        onClose={handleCloseCreate}
      />

      <EditEmployeeDialog
        orgSlug={orgSlug}
        assignableRoles={assignableRoles}
        propietarioRole={propietarioRole}
        employee={editingEmployee}
        open={editingEmployee !== null}
        onClose={handleCloseEdit}
      />

      <DeleteEmployeeDialog
        orgSlug={orgSlug}
        employee={deletingEmployee}
        open={deletingEmployee !== null}
        onClose={handleCloseDelete}
      />
    </>
  )
}
