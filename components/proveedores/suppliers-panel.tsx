'use client'

import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'
import { CreateSupplierDialog } from '@/components/proveedores/create-supplier-dialog'
import { DeleteSupplierDialog } from '@/components/proveedores/delete-supplier-dialog'
import { EditSupplierDialog } from '@/components/proveedores/edit-supplier-dialog'
import type { SupplierRow } from '@/lib/data/suppliers'
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

interface SuppliersPanelProps {
  orgSlug: string
  suppliers: SupplierRow[]
  actions: Pick<ViewActionFlags, 'canCreate' | 'canEdit' | 'canDelete'>
}

export function SuppliersPanel({ orgSlug, suppliers, actions }: SuppliersPanelProps) {
  const [query, setQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<SupplierRow | null>(null)
  const [deletingSupplier, setDeletingSupplier] = useState<SupplierRow | null>(null)

  const filteredSuppliers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return suppliers

    return suppliers.filter((supplier) => {
      const haystack = [
        supplier.name,
        supplier.phone ?? '',
        supplier.email ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [suppliers, query])

  const handleOpenCreate = () => setIsCreateOpen(true)
  const handleCloseCreate = () => setIsCreateOpen(false)
  const handleCloseEdit = () => setEditingSupplier(null)
  const handleCloseDelete = () => setDeletingSupplier(null)

  return (
    <>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <Subheading level={3}>Listado de proveedores</Subheading>
          <Text className={listDescriptionClass}>
            Contactos de tus proveedores. Puedes buscar, crear, editar o eliminar.
          </Text>
        </div>
        <div className={listHeaderActionsClass}>
          {actions.canCreate ? (
            <Button type="button" color="dark/zinc" onClick={handleOpenCreate}>
              <PlusIcon data-slot="icon" aria-hidden="true" />
              Nuevo proveedor
            </Button>
          ) : null}
        </div>
      </div>

      <div className={listSearchClass}>
        <InputGroup>
          <MagnifyingGlassIcon data-slot="icon" aria-hidden="true" />
          <Input
            type="search"
            name="supplier-search"
            placeholder="Buscar por nombre, teléfono o correo"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar proveedor"
          />
        </InputGroup>
      </div>

      {filteredSuppliers.length === 0 ? (
        <div className={listEmptyWrapClass}>
          <Subheading level={3}>
            {suppliers.length === 0 ? 'Sin proveedores' : 'Sin resultados'}
          </Subheading>
          <Text className="mt-2">
            {suppliers.length === 0
              ? 'Registra tu primer proveedor con el botón de arriba.'
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
                    Nombre
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
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className={`${listTdPrimaryClass} text-foreground!`}>
                      {supplier.name}
                    </td>
                    <td className={listTdSecondaryClass}>
                      {supplier.phone ? (
                        <a
                          href={formatPhoneTelHref(supplier.phone) ?? undefined}
                          className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                        >
                          {formatPhoneLabel(supplier.phone)}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="hidden px-3 py-4 text-sm whitespace-nowrap text-foreground! xl:table-cell">
                      {supplier.email ? (
                        <a
                          href={`mailto:${supplier.email}`}
                          className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                        >
                          {supplier.email}
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
                              onClick={() => setEditingSupplier(supplier)}
                              className="text-emerald-600 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:text-emerald-400 dark:hover:text-emerald-300"
                            >
                              Editar
                              <span className="sr-only">, {supplier.name}</span>
                            </button>
                          ) : null}
                          {actions.canDelete ? (
                            <button
                              type="button"
                              onClick={() => setDeletingSupplier(supplier)}
                              className="text-red-600 hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Eliminar
                              <span className="sr-only">, {supplier.name}</span>
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateSupplierDialog
        orgSlug={orgSlug}
        open={isCreateOpen}
        onClose={handleCloseCreate}
      />

      <EditSupplierDialog
        orgSlug={orgSlug}
        supplier={editingSupplier}
        open={editingSupplier !== null}
        onClose={handleCloseEdit}
      />

      <DeleteSupplierDialog
        orgSlug={orgSlug}
        supplier={deletingSupplier}
        open={deletingSupplier !== null}
        onClose={handleCloseDelete}
      />
    </>
  )
}
