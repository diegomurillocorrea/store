'use client'

import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { CreateProductDialog } from '@/components/productos/create-product-dialog'
import { ColumnFilterHeader } from '@/components/productos/column-filter-header'
import { ProductsTableRow } from '@/components/productos/products-table-row'
import type { ProductOption, ProductRow, TagProductOption } from '@/lib/data/product-types'
import { useProductFiltersUrl } from '@/lib/hooks/use-product-filters-url'
import type { ViewActionFlags } from '@/lib/permissions/views'
import {
  listDescriptionClass,
  listEmptyWrapClass,
  listHeadCompactClass,
  listHeaderActionsClass,
  listSearchClass,
  listTableWrapClass,
} from '@/lib/ui/list-chrome'
import type { ProductColumnFilters, ProductColumnKey } from '@/lib/utils/product-filters-url'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Input, InputGroup } from '@/styles/catalyst-ui-kit/input'
import { Subheading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface ProductsPanelProps {
  orgSlug: string
  organizationId: string
  products: ProductRow[]
  categories: ProductOption[]
  tags: TagProductOption[]
  suppliers: ProductOption[]
  actions: Pick<ViewActionFlags, 'canCreate' | 'canEdit' | 'canDelete'>
  initialQuery: string
  initialColumnFilters: ProductColumnFilters
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const percentFormatter = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

interface ProductFilterIndexEntry {
  product: ProductRow
  columnValues: Record<ProductColumnKey, string>
  tagNames: string[]
  searchHaystack: string
  profitLabel: string
  profitPercentLabel: string
  profitToneClass: string
  profitPercentToneClass: string
}

function getProductProfit(
  salePrice: number,
  costPrice: number | null
): number | null {
  if (costPrice == null) return null
  return salePrice - costPrice
}

function getProductProfitPercent(
  salePrice: number,
  costPrice: number | null
): number | null {
  if (costPrice == null || salePrice <= 0) return null
  return ((salePrice - costPrice) / salePrice) * 100
}

function formatCurrency(value: number | null): string {
  if (value == null) return '—'
  return currencyFormatter.format(value)
}

function formatProfitPercent(value: number | null): string {
  if (value == null) return '—'
  return `${percentFormatter.format(value)}%`
}

function profitToneClass(value: number | null): string {
  if (value == null) return 'text-foreground!'
  if (value > 0) {
    return 'text-emerald-600 dark:text-emerald-400'
  }
  if (value < 0) {
    return 'text-red-600 dark:text-red-400'
  }
  return 'text-muted-foreground'
}

function uniqueSortedValues(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
}

function buildProductFilterIndex(products: ProductRow[]): ProductFilterIndexEntry[] {
  return products.map((product) => {
    const profit = getProductProfit(product.salePrice, product.costPrice)
    const profitPercent = getProductProfitPercent(product.salePrice, product.costPrice)
    const tagsLabel =
      product.tagNames.length > 0 ? product.tagNames.join(', ') : 'Sin etiqueta'

    return {
      product,
      tagNames: product.tagNames,
      columnValues: {
        name: product.name,
        category: product.categoryName ?? 'Sin categoría',
        tags: tagsLabel,
        salePrice: formatCurrency(product.salePrice),
        costPrice: formatCurrency(product.costPrice),
        stock: String(product.availableQuantity),
        profit: formatCurrency(profit),
        profitPercent: formatProfitPercent(profitPercent),
      },
      searchHaystack: [
        product.name,
        product.barcode ?? '',
        product.sku,
        product.categoryName ?? '',
        ...product.tagNames,
        product.supplierName ?? '',
        product.createdByName ?? '',
      ]
        .join(' ')
        .toLowerCase(),
      profitLabel: formatCurrency(profit),
      profitPercentLabel: formatProfitPercent(profitPercent),
      profitToneClass: profitToneClass(profit),
      profitPercentToneClass: profitToneClass(profitPercent),
    }
  })
}

function buildActiveColumnFilterSets(
  columnFilters: ProductColumnFilters
): Partial<Record<ProductColumnKey, Set<string>>> {
  const activeFilters: Partial<Record<ProductColumnKey, Set<string>>> = {}

  for (const key of Object.keys(columnFilters) as ProductColumnKey[]) {
    const values = columnFilters[key]
    if (!values || values.length === 0) continue
    activeFilters[key] = new Set(values)
  }

  return activeFilters
}

function matchesTagFilter(entry: ProductFilterIndexEntry, selectedValues: Set<string>): boolean {
  if (selectedValues.has('Sin etiqueta') && entry.tagNames.length === 0) {
    return true
  }
  return entry.tagNames.some((name) => selectedValues.has(name))
}

export function ProductsPanel({
  orgSlug,
  organizationId,
  products,
  categories,
  tags,
  suppliers,
  actions,
  initialQuery,
  initialColumnFilters,
}: ProductsPanelProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { query, setQuery, columnFilters, handleColumnFilterChange } = useProductFiltersUrl(
    pathname,
    { query: initialQuery, columnFilters: initialColumnFilters }
  )
  const deferredQuery = useDeferredValue(query)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const productIndex = useMemo(() => buildProductFilterIndex(products), [products])

  const columnOptions = useMemo(() => {
    const productValues: Record<ProductColumnKey, string[]> = {
      name: [],
      category: [],
      tags: [],
      salePrice: [],
      costPrice: [],
      stock: [],
      profit: [],
      profitPercent: [],
    }

    for (const entry of productIndex) {
      for (const key of Object.keys(productValues) as ProductColumnKey[]) {
        if (key === 'tags') {
          if (entry.tagNames.length === 0) {
            productValues.tags.push('Sin etiqueta')
          } else {
            productValues.tags.push(...entry.tagNames)
          }
          continue
        }
        productValues[key].push(entry.columnValues[key])
      }
    }

    return {
      name: uniqueSortedValues(productValues.name),
      category: uniqueSortedValues([
        ...categories.map((category) => category.name),
        ...productValues.category,
      ]),
      tags: uniqueSortedValues([
        ...tags.map((tag) => tag.name),
        ...productValues.tags,
      ]),
      salePrice: uniqueSortedValues(productValues.salePrice),
      costPrice: uniqueSortedValues(productValues.costPrice),
      stock: uniqueSortedValues(productValues.stock),
      profit: uniqueSortedValues(productValues.profit),
      profitPercent: uniqueSortedValues(productValues.profitPercent),
    }
  }, [productIndex, categories, tags])

  const filteredProducts = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase()
    const activeFilters = buildActiveColumnFilterSets(columnFilters)
    const activeFilterEntries = Object.entries(activeFilters) as [
      ProductColumnKey,
      Set<string>,
    ][]

    return productIndex.filter((entry) => {
      for (const [key, selectedValues] of activeFilterEntries) {
        if (key === 'tags') {
          if (!matchesTagFilter(entry, selectedValues)) return false
          continue
        }
        if (!selectedValues.has(entry.columnValues[key])) return false
      }

      if (normalizedQuery && !entry.searchHaystack.includes(normalizedQuery)) {
        return false
      }

      return true
    })
  }, [productIndex, deferredQuery, columnFilters])

  const handleOpenCreate = () => setIsCreateOpen(true)
  const handleCloseCreate = () => setIsCreateOpen(false)

  const handleRowOpen = useCallback((productId: string) => {
    router.push(`/${orgSlug}/productos/${productId}`)
  }, [orgSlug, router])

  return (
    <>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <Subheading level={3}>Catálogo de productos</Subheading>
          <Text className={listDescriptionClass}>
            Administra precios, stock y relaciones con categorías, etiquetas y proveedores.
          </Text>
        </div>
        <div className={listHeaderActionsClass}>
          {actions.canCreate ? (
            <Button type="button" color="dark/zinc" onClick={handleOpenCreate}>
              <PlusIcon data-slot="icon" aria-hidden="true" />
              Nuevo producto
            </Button>
          ) : null}
        </div>
      </div>

      <div className={listSearchClass}>
        <InputGroup>
          <MagnifyingGlassIcon data-slot="icon" aria-hidden="true" />
          <Input
            type="search"
            name="product-search"
            placeholder="Buscar por nombre, código, categoría o etiqueta"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar producto"
          />
        </InputGroup>
      </div>

      {products.length === 0 ? (
        <div className={listEmptyWrapClass}>
          <Subheading level={3}>Sin productos</Subheading>
          <Text className="mt-2">
            Registra tu primer producto con el botón de arriba.
          </Text>
        </div>
      ) : (
        <div className={`${listTableWrapClass} w-full`}>
          <div className="w-full overflow-x-auto">
            <table className="relative w-full min-w-0 divide-y divide-border xl:table-fixed">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="hidden w-24 px-3 py-3.5 text-center text-sm font-semibold text-foreground! md:table-cell"
                  >
                    Imagen
                  </th>
                  <th
                    scope="col"
                    className={`min-w-0 ${listHeadCompactClass} xl:w-[18%]`}
                  >
                    <ColumnFilterHeader
                      label="Nombre"
                      options={columnOptions.name}
                      selected={columnFilters.name ?? []}
                      onChange={(selected) => handleColumnFilterChange('name', selected)}
                    />
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3.5 text-center text-sm font-semibold text-foreground! md:table-cell xl:w-[12%]"
                  >
                    <ColumnFilterHeader
                      label="Categoría"
                      options={columnOptions.category}
                      selected={columnFilters.category ?? []}
                      onChange={(selected) => handleColumnFilterChange('category', selected)}
                    />
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3.5 text-center text-sm font-semibold text-foreground! lg:table-cell xl:w-[12%]"
                  >
                    <ColumnFilterHeader
                      label="Etiquetas"
                      options={columnOptions.tags}
                      selected={columnFilters.tags ?? []}
                      onChange={(selected) => handleColumnFilterChange('tags', selected)}
                    />
                  </th>
                  <th
                    scope="col"
                    className={`${listHeadCompactClass} xl:w-[10%]`}
                  >
                    <ColumnFilterHeader
                      label="Precio"
                      options={columnOptions.salePrice}
                      selected={columnFilters.salePrice ?? []}
                      onChange={(selected) => handleColumnFilterChange('salePrice', selected)}
                    />
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3.5 text-center text-sm font-semibold text-foreground! lg:table-cell xl:w-[10%]"
                  >
                    <ColumnFilterHeader
                      label="Costo"
                      options={columnOptions.costPrice}
                      selected={columnFilters.costPrice ?? []}
                      onChange={(selected) => handleColumnFilterChange('costPrice', selected)}
                    />
                  </th>
                  <th
                    scope="col"
                    className={`${listHeadCompactClass} xl:w-[8%]`}
                  >
                    <ColumnFilterHeader
                      label="Stock"
                      options={columnOptions.stock}
                      selected={columnFilters.stock ?? []}
                      onChange={(selected) => handleColumnFilterChange('stock', selected)}
                    />
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3.5 text-center text-sm font-semibold text-foreground! xl:table-cell xl:w-[10%]"
                  >
                    <ColumnFilterHeader
                      label="Ganancia"
                      options={columnOptions.profit}
                      selected={columnFilters.profit ?? []}
                      onChange={(selected) => handleColumnFilterChange('profit', selected)}
                    />
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3.5 text-center text-sm font-semibold text-foreground! xl:table-cell xl:w-[10%]"
                  >
                    <ColumnFilterHeader
                      label="% Margen"
                      options={columnOptions.profitPercent}
                      selected={columnFilters.profitPercent ?? []}
                      onChange={(selected) => handleColumnFilterChange('profitPercent', selected)}
                    />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center md:py-10">
                      <Subheading level={3}>Sin resultados</Subheading>
                      <Text className="mt-2">
                        Prueba con otro término de búsqueda o ajusta los filtros de columna.
                      </Text>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((entry) => (
                    <ProductsTableRow
                      key={entry.product.id}
                      orgSlug={orgSlug}
                      product={entry.product}
                      canEdit={actions.canEdit}
                      profitLabel={entry.profitLabel}
                      profitPercentLabel={entry.profitPercentLabel}
                      profitToneClass={entry.profitToneClass}
                      profitPercentToneClass={entry.profitPercentToneClass}
                      onOpen={handleRowOpen}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateProductDialog
        orgSlug={orgSlug}
        organizationId={organizationId}
        categories={categories}
        tags={tags}
        suppliers={suppliers}
        open={isCreateOpen}
        onClose={handleCloseCreate}
      />
    </>
  )
}
