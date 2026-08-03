'use client'

import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { CreateProductDialog } from '@/components/productos/create-product-dialog'
import { ColumnFilterHeader } from '@/components/productos/column-filter-header'
import { ProductsTableRow } from '@/components/productos/products-table-row'
import type { ProductOption, ProductRow, SubCategoryProductOption } from '@/lib/data/product-types'
import { useProductFiltersUrl } from '@/lib/hooks/use-product-filters-url'
import type { ViewActionFlags } from '@/lib/permissions/views'
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
  subCategories: SubCategoryProductOption[]
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

    return {
      product,
      columnValues: {
        name: product.name,
        category: product.categoryName ?? 'Sin categoría',
        subCategory: product.subCategoryName ?? 'Sin subcategoría',
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
        product.subCategoryName ?? '',
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

export function ProductsPanel({
  orgSlug,
  organizationId,
  products,
  categories,
  subCategories,
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
    const selectedCategoryNames = columnFilters.category ?? []
    const selectedCategorySet =
      selectedCategoryNames.length > 0 ? new Set(selectedCategoryNames) : null
    const categoryNameById = new Map(categories.map((category) => [category.id, category.name]))

    const productValues: Record<ProductColumnKey, string[]> = {
      name: [],
      category: [],
      subCategory: [],
      salePrice: [],
      costPrice: [],
      stock: [],
      profit: [],
      profitPercent: [],
    }

    for (const entry of productIndex) {
      for (const key of Object.keys(productValues) as ProductColumnKey[]) {
        productValues[key].push(entry.columnValues[key])
      }
    }

    const catalogSubCategoryNames = subCategories
      .filter((subCategory) => {
        if (!selectedCategorySet) return true
        const categoryName = categoryNameById.get(subCategory.categoryId)
        return categoryName != null && selectedCategorySet.has(categoryName)
      })
      .map((subCategory) => subCategory.name)

    const productSubCategoryNames = productIndex
      .filter((entry) => {
        if (!selectedCategorySet) return true
        return selectedCategorySet.has(entry.columnValues.category)
      })
      .map((entry) => entry.columnValues.subCategory)

    return {
      name: uniqueSortedValues(productValues.name),
      category: uniqueSortedValues([
        ...categories.map((category) => category.name),
        ...productValues.category,
      ]),
      subCategory: uniqueSortedValues([
        ...catalogSubCategoryNames,
        ...productSubCategoryNames,
      ]),
      salePrice: uniqueSortedValues(productValues.salePrice),
      costPrice: uniqueSortedValues(productValues.costPrice),
      stock: uniqueSortedValues(productValues.stock),
      profit: uniqueSortedValues(productValues.profit),
      profitPercent: uniqueSortedValues(productValues.profitPercent),
    }
  }, [productIndex, categories, subCategories, columnFilters.category])

  const filteredProducts = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase()
    const activeFilters = buildActiveColumnFilterSets(columnFilters)
    const activeFilterEntries = Object.entries(activeFilters) as [
      ProductColumnKey,
      Set<string>,
    ][]

    return productIndex.filter((entry) => {
      for (const [key, selectedValues] of activeFilterEntries) {
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
          <Text className="mt-2 max-w-2xl">
            Administra precios, stock y relaciones con categorías y proveedores.
          </Text>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          {actions.canCreate ? (
            <Button type="button" color="dark/zinc" onClick={handleOpenCreate}>
              <PlusIcon data-slot="icon" aria-hidden="true" />
              Nuevo producto
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 max-w-md">
        <InputGroup>
          <MagnifyingGlassIcon data-slot="icon" aria-hidden="true" />
          <Input
            type="search"
            name="product-search"
            placeholder="Buscar por nombre, código o categoría"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar producto"
          />
        </InputGroup>
      </div>

      {products.length === 0 ? (
        <div className="glass-surface mt-8 rounded-xl p-8 text-center sm:rounded-2xl">
          <Subheading level={3}>Sin productos</Subheading>
          <Text className="mt-2">
            Registra tu primer producto con el botón de arriba.
          </Text>
        </div>
      ) : (
        <div className="glass-surface mt-8 w-full overflow-hidden rounded-xl sm:rounded-2xl">
          <div className="w-full overflow-x-auto">
            <table className="relative w-full table-fixed divide-y divide-border">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="w-24 px-3 py-3.5 text-center text-sm font-semibold text-foreground!"
                  >
                    Imagen
                  </th>
                  <th
                    scope="col"
                    className="w-[18%] px-3 py-3.5 text-center text-sm font-semibold text-foreground!"
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
                    className="w-[12%] px-3 py-3.5 text-center text-sm font-semibold text-foreground!"
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
                    className="w-[12%] px-3 py-3.5 text-center text-sm font-semibold text-foreground!"
                  >
                    <ColumnFilterHeader
                      label="Subcategoría"
                      options={columnOptions.subCategory}
                      selected={columnFilters.subCategory ?? []}
                      onChange={(selected) => handleColumnFilterChange('subCategory', selected)}
                    />
                  </th>
                  <th
                    scope="col"
                    className="w-[10%] px-3 py-3.5 text-center text-sm font-semibold text-foreground!"
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
                    className="w-[10%] px-3 py-3.5 text-center text-sm font-semibold text-foreground!"
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
                    className="w-[8%] px-3 py-3.5 text-center text-sm font-semibold text-foreground!"
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
                    className="w-[10%] px-3 py-3.5 text-center text-sm font-semibold text-foreground!"
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
                    className="w-[10%] px-3 py-3.5 text-center text-sm font-semibold text-foreground!"
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
                    <td colSpan={9} className="px-3 py-10 text-center">
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
        subCategories={subCategories}
        suppliers={suppliers}
        open={isCreateOpen}
        onClose={handleCloseCreate}
      />
    </>
  )
}
