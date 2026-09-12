'use client'

import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'
import { CreateCategoryDialog } from '@/components/categorias/create-category-dialog'
import { DeleteCategoryDialog } from '@/components/categorias/delete-category-dialog'
import { EditCategoryDialog } from '@/components/categorias/edit-category-dialog'
import { CatalogDotBadge } from '@/components/catalog-dot-badge'
import type { CategoryRow } from '@/lib/data/categories'
import {
  listActionsRowClass,
  listDescriptionClass,
  listEmptyWrapClass,
  listHeaderActionsClass,
  listSearchClass,
  listTableWrapClass,
  listTdActionsClass,
  listTdPrimaryClass,
  listThActionsClass,
  listThPrimaryClass,
} from '@/lib/ui/list-chrome'
import type { ViewActionFlags } from '@/lib/permissions/views'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Input, InputGroup } from '@/styles/catalyst-ui-kit/input'
import { Subheading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface CategoriesPanelProps {
  orgSlug: string
  categories: CategoryRow[]
  actions: Pick<ViewActionFlags, 'canCreate' | 'canEdit' | 'canDelete'>
}

export function CategoriesPanel({ orgSlug, categories, actions }: CategoriesPanelProps) {
  const [query, setQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<CategoryRow | null>(null)

  const filteredCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return categories
    return categories.filter((category) =>
      category.name.toLowerCase().includes(normalizedQuery)
    )
  }, [categories, query])

  const handleOpenCreate = () => setIsCreateOpen(true)
  const handleCloseCreate = () => setIsCreateOpen(false)
  const handleCloseEdit = () => setEditingCategory(null)
  const handleCloseDelete = () => setDeletingCategory(null)

  return (
    <>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <Subheading level={3}>Listado de categorías</Subheading>
          <Text className={listDescriptionClass}>
            Todas las categorías de tu catálogo. Puedes buscar, crear, editar o eliminar.
          </Text>
        </div>
        <div className={listHeaderActionsClass}>
          {actions.canCreate ? (
            <Button type="button" color="dark/zinc" onClick={handleOpenCreate}>
              <PlusIcon data-slot="icon" aria-hidden="true" />
              Nueva categoría
            </Button>
          ) : null}
        </div>
      </div>

      <div className={listSearchClass}>
        <InputGroup>
          <MagnifyingGlassIcon data-slot="icon" aria-hidden="true" />
          <Input
            type="search"
            name="category-search"
            placeholder="Buscar categoría"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar categoría"
          />
        </InputGroup>
      </div>

      {filteredCategories.length === 0 ? (
        <div className={listEmptyWrapClass}>
          <Subheading level={3}>
            {categories.length === 0 ? 'Sin categorías' : 'Sin resultados'}
          </Subheading>
          <Text className="mt-2">
            {categories.length === 0
              ? 'Crea tu primera categoría con el botón de arriba.'
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
                  <th scope="col" className={listThActionsClass}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCategories.map((category) => (
                  <tr key={category.id}>
                    <td className={listTdPrimaryClass}>
                      <CatalogDotBadge>{category.name}</CatalogDotBadge>
                    </td>
                    <td className={listTdActionsClass}>
                      {actions.canEdit || actions.canDelete ? (
                        <div className={listActionsRowClass}>
                          {actions.canEdit ? (
                            <button
                              type="button"
                              onClick={() => setEditingCategory(category)}
                              className="text-emerald-600 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:text-emerald-400 dark:hover:text-emerald-300"
                            >
                              Editar
                              <span className="sr-only">, {category.name}</span>
                            </button>
                          ) : null}
                          {actions.canDelete ? (
                            <button
                              type="button"
                              onClick={() => setDeletingCategory(category)}
                              className="text-red-600 hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Eliminar
                              <span className="sr-only">, {category.name}</span>
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

      <CreateCategoryDialog
        orgSlug={orgSlug}
        open={isCreateOpen}
        onClose={handleCloseCreate}
      />

      {editingCategory ? (
        <EditCategoryDialog
          key={editingCategory.id}
          orgSlug={orgSlug}
          category={editingCategory}
          open
          onClose={handleCloseEdit}
        />
      ) : null}

      <DeleteCategoryDialog
        orgSlug={orgSlug}
        category={deletingCategory}
        open={deletingCategory !== null}
        onClose={handleCloseDelete}
      />
    </>
  )
}
