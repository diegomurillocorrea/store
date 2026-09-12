'use client'

import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'
import { CreateCustomerDialog } from '@/components/clientes/create-customer-dialog'
import { DeleteCustomerDialog } from '@/components/clientes/delete-customer-dialog'
import { EditCustomerDialog } from '@/components/clientes/edit-customer-dialog'
import { getCustomerFullName, type CustomerRow } from '@/lib/data/customer-types'
import {
  listActionsRowClass,
  listDescriptionClass,
  listEmptyWrapClass,
  listHeaderActionsClass,
  listSearchClass,
  listTableWrapClass,
  listTdActionsClass,
  listTdPrimaryClass,
  listTdSecondaryClass,
  listThActionsClass,
  listThPrimaryClass,
  listThSecondaryClass,
} from '@/lib/ui/list-chrome'
import type { ViewActionFlags } from '@/lib/permissions/views'
import { formatPhoneLabel, formatPhoneTelHref } from '@/lib/utils/phone'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Input, InputGroup } from '@/styles/catalyst-ui-kit/input'
import { Subheading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface CustomersPanelProps {
  orgSlug: string
  customers: CustomerRow[]
  actions: Pick<ViewActionFlags, 'canCreate' | 'canEdit' | 'canDelete'>
}

export function CustomersPanel({ orgSlug, customers, actions }: CustomersPanelProps) {
  const [query, setQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<CustomerRow | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerRow | null>(null)

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return customers

    return customers.filter((customer) => {
      const haystack = [
        customer.firstName,
        customer.lastName,
        getCustomerFullName(customer),
        customer.phone ?? '',
        customer.email ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [customers, query])

  const handleOpenCreate = () => setIsCreateOpen(true)
  const handleCloseCreate = () => setIsCreateOpen(false)
  const handleCloseEdit = () => setEditingCustomer(null)
  const handleCloseDelete = () => setDeletingCustomer(null)

  return (
    <>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <Subheading level={3}>Listado de clientes</Subheading>
          <Text className={listDescriptionClass}>
            Fichas de tus clientes. Puedes buscar, crear, editar o eliminar.
          </Text>
        </div>
        <div className={listHeaderActionsClass}>
          {actions.canCreate ? (
            <Button type="button" color="dark/zinc" onClick={handleOpenCreate}>
              <PlusIcon data-slot="icon" aria-hidden="true" />
              Nuevo cliente
            </Button>
          ) : null}
        </div>
      </div>

      <div className={listSearchClass}>
        <InputGroup>
          <MagnifyingGlassIcon data-slot="icon" aria-hidden="true" />
          <Input
            type="search"
            name="customer-search"
            placeholder="Buscar por nombre, teléfono o correo"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar cliente"
          />
        </InputGroup>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className={listEmptyWrapClass}>
          <Subheading level={3}>
            {customers.length === 0 ? 'Sin clientes' : 'Sin resultados'}
          </Subheading>
          <Text className="mt-2">
            {customers.length === 0
              ? 'Registra tu primer cliente con el botón de arriba.'
              : 'Prueba con otro término de búsqueda.'}
          </Text>
        </div>
      ) : (
        <div className={listTableWrapClass}>
          <div className="overflow-x-auto">
            <table className="relative min-w-0 w-full divide-y divide-border">
              <thead>
                <tr>
                  <th scope="col" className={listThPrimaryClass}>
                    Nombres
                  </th>
                  <th scope="col" className={listThSecondaryClass}>
                    Apellidos
                  </th>
                  <th scope="col" className={listThSecondaryClass}>
                    Teléfono
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3.5 text-left text-sm font-semibold text-foreground! xl:table-cell"
                  >
                    Correo
                  </th>
                  <th scope="col" className={listThActionsClass}>
                    {actions.canEdit || actions.canDelete ? (
                      <span className="sr-only">Acciones</span>
                    ) : null}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCustomers.map((customer) => {
                  const fullName = getCustomerFullName(customer)

                  return (
                    <tr key={customer.id}>
                      <td className={`${listTdPrimaryClass} text-foreground!`}>
                        {customer.firstName}
                      </td>
                      <td className={listTdSecondaryClass}>
                        {customer.lastName}
                      </td>
                      <td className={listTdSecondaryClass}>
                        {customer.phone ? (
                          <a
                            href={formatPhoneTelHref(customer.phone) ?? undefined}
                            className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                          >
                            {formatPhoneLabel(customer.phone)}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="hidden px-3 py-4 text-sm whitespace-nowrap text-foreground! xl:table-cell">
                        {customer.email ? (
                          <a
                            href={`mailto:${customer.email}`}
                            className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                          >
                            {customer.email}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={listTdActionsClass}>
                        {actions.canEdit || actions.canDelete ? (
                          <div className={listActionsRowClass}>
                            {actions.canEdit ? (
                              <button
                                type="button"
                                onClick={() => setEditingCustomer(customer)}
                                className="text-emerald-600 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:text-emerald-400 dark:hover:text-emerald-300"
                              >
                                Editar
                                <span className="sr-only">, {fullName}</span>
                              </button>
                            ) : null}
                            {actions.canDelete ? (
                              <button
                                type="button"
                                onClick={() => setDeletingCustomer(customer)}
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

      <CreateCustomerDialog
        orgSlug={orgSlug}
        open={isCreateOpen}
        onClose={handleCloseCreate}
      />

      <EditCustomerDialog
        orgSlug={orgSlug}
        customer={editingCustomer}
        open={editingCustomer !== null}
        onClose={handleCloseEdit}
      />

      <DeleteCustomerDialog
        orgSlug={orgSlug}
        customer={deletingCustomer}
        open={deletingCustomer !== null}
        onClose={handleCloseDelete}
      />
    </>
  )
}
