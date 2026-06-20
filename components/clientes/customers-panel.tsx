'use client'

import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'
import { CreateCustomerDialog } from '@/components/clientes/create-customer-dialog'
import { DeleteCustomerDialog } from '@/components/clientes/delete-customer-dialog'
import { EditCustomerDialog } from '@/components/clientes/edit-customer-dialog'
import { getCustomerFullName, type CustomerRow } from '@/lib/data/customer-types'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Input, InputGroup } from '@/styles/catalyst-ui-kit/input'
import { Subheading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface CustomersPanelProps {
  orgSlug: string
  customers: CustomerRow[]
}

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatCreatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return dateFormatter.format(date)
}

export function CustomersPanel({ orgSlug, customers }: CustomersPanelProps) {
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
        customer.createdByName ?? '',
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
          <Text className="mt-2 max-w-2xl">
            Fichas de tus clientes. Puedes buscar, crear, editar o eliminar.
          </Text>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Button type="button" color="dark/zinc" onClick={handleOpenCreate}>
            <PlusIcon data-slot="icon" aria-hidden="true" />
            Nuevo cliente
          </Button>
        </div>
      </div>

      <div className="mt-6 max-w-md">
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
        <div className="glass-surface mt-8 rounded-xl p-8 text-center sm:rounded-2xl">
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
                    className="hidden px-3 py-3.5 text-left text-sm font-semibold text-foreground! lg:table-cell"
                  >
                    Creado por
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3.5 text-left text-sm font-semibold text-foreground! md:table-cell"
                  >
                    Fecha de creación
                  </th>
                  <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-6">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCustomers.map((customer) => {
                  const fullName = getCustomerFullName(customer)

                  return (
                    <tr key={customer.id}>
                      <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-foreground! sm:pl-6">
                        {customer.firstName}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-foreground!">
                        {customer.lastName}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-foreground!">
                        {customer.phone ?? '—'}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-foreground!">
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
                      <td className="hidden px-3 py-4 text-sm whitespace-nowrap text-foreground! lg:table-cell">
                        {customer.createdByName ?? '—'}
                      </td>
                      <td className="hidden px-3 py-4 text-sm whitespace-nowrap text-muted-foreground md:table-cell">
                        {formatCreatedAt(customer.createdAt)}
                      </td>
                      <td className="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                        <div className="flex items-center justify-end gap-4">
                          <button
                            type="button"
                            onClick={() => setEditingCustomer(customer)}
                            className="text-emerald-600 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:text-emerald-400 dark:hover:text-emerald-300"
                          >
                            Editar
                            <span className="sr-only">, {fullName}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingCustomer(customer)}
                            className="text-red-600 hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Eliminar
                            <span className="sr-only">, {fullName}</span>
                          </button>
                        </div>
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
