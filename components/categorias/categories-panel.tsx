'use client'

import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'
import { CreateCategoryDialog } from '@/components/categorias/create-category-dialog'
import { DeleteCategoryDialog } from '@/components/categorias/delete-category-dialog'
import { EditCategoryDialog } from '@/components/categorias/edit-category-dialog'
import type { CategoryRow } from '@/lib/data/categories'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Input, InputGroup } from '@/styles/catalyst-ui-kit/input'
import { Subheading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface CategoriesPanelProps {
  orgSlug: string
  categories: CategoryRow[]
}

export function CategoriesPanel({ orgSlug, categories }: CategoriesPanelProps) {
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
          <Text className="mt-2 max-w-2xl">
            Todas las categorías de tu catálogo. Puedes buscar, crear, editar o eliminar.
          </Text>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Button type="button" color="dark/zinc" onClick={handleOpenCreate}>
            <PlusIcon data-slot="icon" aria-hidden="true" />
            Nueva categoría
          </Button>
        </div>
      </div>

      <div className="mt-6 max-w-md">
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
        <div className="glass-surface mt-8 rounded-xl p-8 text-center sm:rounded-2xl">
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
                  <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-6">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCategories.map((category) => (
                  <tr key={category.id}>
                    <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-foreground! sm:pl-6">
                      {category.name}
                    </td>
                    <td className="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                      <div className="flex items-center justify-end gap-4">
                        <button
                          type="button"
                          onClick={() => setEditingCategory(category)}
                          className="text-emerald-600 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:text-emerald-400 dark:hover:text-emerald-300"
                        >
                          Editar
                          <span className="sr-only">, {category.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCategory(category)}
                          className="text-red-600 hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Eliminar
                          <span className="sr-only">, {category.name}</span>
                        </button>
                      </div>
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
