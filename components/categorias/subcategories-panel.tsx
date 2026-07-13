'use client'

import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'
import { CreateSubCategoryDialog } from '@/components/categorias/create-subcategory-dialog'
import { DeleteSubCategoryDialog } from '@/components/categorias/delete-subcategory-dialog'
import { EditSubCategoryDialog } from '@/components/categorias/edit-subcategory-dialog'
import { CatalogDotBadge } from '@/components/catalog-dot-badge'
import type { CategoryRow } from '@/lib/data/categories'
import type { SubCategoryRow } from '@/lib/data/subcategories'
import type { ViewActionFlags } from '@/lib/permissions/views'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Input, InputGroup } from '@/styles/catalyst-ui-kit/input'
import { Select } from '@/styles/catalyst-ui-kit/select'
import { Subheading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface SubCategoriesPanelProps {
  orgSlug: string
  categories: CategoryRow[]
  subCategories: SubCategoryRow[]
  actions: Pick<ViewActionFlags, 'canCreate' | 'canEdit' | 'canDelete'>
}

export function SubCategoriesPanel({
  orgSlug,
  categories,
  subCategories,
  actions,
}: SubCategoriesPanelProps) {
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategoryRow | null>(null)
  const [deletingSubCategory, setDeletingSubCategory] = useState<SubCategoryRow | null>(null)

  const filteredSubCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return subCategories.filter((subCategory) => {
      if (categoryFilter && subCategory.categoryId !== categoryFilter) {
        return false
      }

      if (!normalizedQuery) return true

      return (
        subCategory.name.toLowerCase().includes(normalizedQuery) ||
        subCategory.categoryName.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [subCategories, query, categoryFilter])

  const handleOpenCreate = () => setIsCreateOpen(true)
  const handleCloseCreate = () => setIsCreateOpen(false)
  const handleCloseEdit = () => setEditingSubCategory(null)
  const handleCloseDelete = () => setDeletingSubCategory(null)

  return (
    <>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <Subheading level={3}>Listado de subcategorías</Subheading>
          <Text className="mt-2 max-w-2xl">
            Organiza productos con mayor detalle dentro de cada categoría. Por ejemplo, Porsche
            dentro de HotWheels.
          </Text>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          {actions.canCreate ? (
            <Button type="button" color="dark/zinc" onClick={handleOpenCreate}>
              <PlusIcon data-slot="icon" aria-hidden="true" />
              Nueva subcategoría
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid max-w-3xl grid-cols-1 items-end gap-4 sm:grid-cols-2">
        <InputGroup>
          <MagnifyingGlassIcon data-slot="icon" aria-hidden="true" />
          <Input
            type="search"
            name="subcategory-search"
            placeholder="Buscar subcategoría"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar subcategoría"
          />
        </InputGroup>

        <Select
          id="subcategory-category-filter"
          name="categoryFilter"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Filtrar por categoría"
        >
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>

      {filteredSubCategories.length === 0 ? (
        <div className="glass-surface mt-8 rounded-xl p-8 text-center sm:rounded-2xl">
          <Subheading level={3}>
            {subCategories.length === 0 ? 'Sin subcategorías' : 'Sin resultados'}
          </Subheading>
          <Text className="mt-2">
            {subCategories.length === 0
              ? categories.length === 0
                ? 'Primero crea una categoría y luego agrega subcategorías.'
                : 'Crea tu primera subcategoría con el botón de arriba.'
              : 'Prueba con otro término de búsqueda o filtro.'}
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
                    Nombre
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-foreground!"
                  >
                    Categoría
                  </th>
                  <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-6">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSubCategories.map((subCategory) => (
                  <tr key={subCategory.id}>
                    <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-foreground! sm:pl-6">
                      {subCategory.name}
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap">
                      {subCategory.categoryName ? (
                        <CatalogDotBadge>{subCategory.categoryName}</CatalogDotBadge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                      {actions.canEdit || actions.canDelete ? (
                        <div className="flex items-center justify-end gap-4">
                          {actions.canEdit ? (
                            <button
                              type="button"
                              onClick={() => setEditingSubCategory(subCategory)}
                              className="text-emerald-600 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:text-emerald-400 dark:hover:text-emerald-300"
                            >
                              Editar
                              <span className="sr-only">, {subCategory.name}</span>
                            </button>
                          ) : null}
                          {actions.canDelete ? (
                            <button
                              type="button"
                              onClick={() => setDeletingSubCategory(subCategory)}
                              className="text-red-600 hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Eliminar
                              <span className="sr-only">, {subCategory.name}</span>
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

      <CreateSubCategoryDialog
        orgSlug={orgSlug}
        categories={categories}
        open={isCreateOpen}
        onClose={handleCloseCreate}
      />

      {editingSubCategory ? (
        <EditSubCategoryDialog
          key={editingSubCategory.id}
          orgSlug={orgSlug}
          categories={categories}
          subCategory={editingSubCategory}
          open
          onClose={handleCloseEdit}
        />
      ) : null}

      <DeleteSubCategoryDialog
        orgSlug={orgSlug}
        subCategory={deletingSubCategory}
        open={deletingSubCategory !== null}
        onClose={handleCloseDelete}
      />
    </>
  )
}
