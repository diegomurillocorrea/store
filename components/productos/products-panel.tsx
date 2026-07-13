'use client'

import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { CatalogDotBadge } from '@/components/catalog-dot-badge'
import { CreateProductDialog } from '@/components/productos/create-product-dialog'
import { ColumnFilterHeader } from '@/components/productos/column-filter-header'
import { OptimizedImage } from '@/components/optimized-image'
import { ProductInlineFields } from '@/components/productos/product-inline-fields'
import type { ProductOption, ProductRow, SubCategoryProductOption } from '@/lib/data/product-types'
import type { ViewActionFlags } from '@/lib/permissions/views'
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
}

type ColumnKey =
  | 'name'
  | 'category'
  | 'subCategory'
  | 'salePrice'
  | 'costPrice'
  | 'stock'
  | 'profit'
  | 'profitPercent'

type ColumnFilters = Partial<Record<ColumnKey, string[]>>

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const percentFormatter = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

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

function getColumnValue(product: ProductRow, key: ColumnKey): string {
  switch (key) {
    case 'name':
      return product.name
    case 'category':
      return product.categoryName ?? 'Sin categoría'
    case 'subCategory':
      return product.subCategoryName ?? 'Sin subcategoría'
    case 'salePrice':
      return formatCurrency(product.salePrice)
    case 'costPrice':
      return formatCurrency(product.costPrice)
    case 'stock':
      return String(product.availableQuantity)
    case 'profit':
      return formatCurrency(getProductProfit(product.salePrice, product.costPrice))
    case 'profitPercent':
      return formatProfitPercent(
        getProductProfitPercent(product.salePrice, product.costPrice)
      )
  }
}

function uniqueSortedValues(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
}

export function ProductsPanel({
  orgSlug,
  organizationId,
  products,
  categories,
  subCategories,
  suppliers,
  actions,
}: ProductsPanelProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({})
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const columnOptions = useMemo(() => {
    const selectedCategoryNames = columnFilters.category ?? []
    const categoryNameById = new Map(categories.map((category) => [category.id, category.name]))

    const productValues: Record<ColumnKey, string[]> = {
      name: [],
      category: [],
      subCategory: [],
      salePrice: [],
      costPrice: [],
      stock: [],
      profit: [],
      profitPercent: [],
    }

    for (const product of products) {
      for (const key of Object.keys(productValues) as ColumnKey[]) {
        productValues[key].push(getColumnValue(product, key))
      }
    }

    const catalogSubCategoryNames = subCategories
      .filter((subCategory) => {
        if (selectedCategoryNames.length === 0) return true
        const categoryName = categoryNameById.get(subCategory.categoryId)
        return categoryName != null && selectedCategoryNames.includes(categoryName)
      })
      .map((subCategory) => subCategory.name)

    const productSubCategoryNames = products
      .filter((product) => {
        if (selectedCategoryNames.length === 0) return true
        return selectedCategoryNames.includes(product.categoryName ?? 'Sin categoría')
      })
      .map((product) => product.subCategoryName ?? 'Sin subcategoría')

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
  }, [products, categories, subCategories, columnFilters.category])

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return products.filter((product) => {
      for (const key of Object.keys(columnFilters) as ColumnKey[]) {
        const selected = columnFilters[key]
        if (!selected || selected.length === 0) continue
        if (!selected.includes(getColumnValue(product, key))) return false
      }

      if (!normalizedQuery) return true

      const haystack = [
        product.name,
        product.barcode ?? '',
        product.sku,
        product.categoryName ?? '',
        product.subCategoryName ?? '',
        product.supplierName ?? '',
        product.createdByName ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [products, query, columnFilters])

  const handleColumnFilterChange = (key: ColumnKey, selected: string[]) => {
    setColumnFilters((previous) => ({
      ...previous,
      [key]: selected,
    }))
  }

  const handleOpenCreate = () => setIsCreateOpen(true)
  const handleCloseCreate = () => setIsCreateOpen(false)

  const handleRowClick = (productId: string) => {
    router.push(`/${orgSlug}/productos/${productId}`)
  }

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>, productId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleRowClick(productId)
    }
  }

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
                  filteredProducts.map((product) => {
                    const profit = getProductProfit(product.salePrice, product.costPrice)
                    const profitPercent = getProductProfitPercent(
                      product.salePrice,
                      product.costPrice
                    )

                    return (
                      <tr
                        key={product.id}
                        tabIndex={0}
                        role="link"
                        aria-label={`Ver detalle de ${product.name}`}
                        onClick={() => handleRowClick(product.id)}
                        onKeyDown={(event) => handleRowKeyDown(event, product.id)}
                        className="cursor-pointer transition hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                      >
                        <td className="px-3 py-4 text-center">
                          <div className="flex justify-center">
                            {product.imageUrl ? (
                              <OptimizedImage
                                src={product.imageUrl}
                                alt=""
                                width={64}
                                height={64}
                                sizes="64px"
                                className="size-16 rounded-lg border border-border object-cover"
                              />
                            ) : (
                              <div
                                aria-hidden="true"
                                className="flex size-16 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-xs text-muted-foreground"
                              >
                                —
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-center text-sm font-medium text-foreground!">
                          <span className="line-clamp-2 break-words">{product.name}</span>
                        </td>
                        <td className="px-3 py-4 text-center">
                          {product.categoryName ? (
                            <div className="flex justify-center">
                              <CatalogDotBadge>{product.categoryName}</CatalogDotBadge>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-4 text-center">
                          {product.subCategoryName ? (
                            <div className="flex justify-center">
                              <CatalogDotBadge>{product.subCategoryName}</CatalogDotBadge>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                        <ProductInlineFields
                          orgSlug={orgSlug}
                          product={product}
                          canEdit={actions.canEdit}
                        />
                        <td
                          className={`px-3 py-4 text-center text-sm whitespace-nowrap ${profitToneClass(profit)}`}
                        >
                          {formatCurrency(profit)}
                        </td>
                        <td
                          className={`px-3 py-4 text-center text-sm whitespace-nowrap ${profitToneClass(profitPercent)}`}
                        >
                          {formatProfitPercent(profitPercent)}
                        </td>
                      </tr>
                    )
                  })
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
