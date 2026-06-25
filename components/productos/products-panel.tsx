'use client'

import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { CreateProductDialog } from '@/components/productos/create-product-dialog'
import { OptimizedImage } from '@/components/optimized-image'
import { ProductInlineFields } from '@/components/productos/product-inline-fields'
import type { ProductOption, ProductRow } from '@/lib/data/product-types'
import type { ViewActionFlags } from '@/lib/permissions/views'
import { IMAGE_SIZES } from '@/lib/utils/image-src'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Input, InputGroup } from '@/styles/catalyst-ui-kit/input'
import { Subheading } from '@/styles/catalyst-ui-kit/heading'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface ProductsPanelProps {
  orgSlug: string
  organizationId: string
  products: ProductRow[]
  categories: ProductOption[]
  suppliers: ProductOption[]
  actions: Pick<ViewActionFlags, 'canCreate' | 'canEdit' | 'canDelete'>
}

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

export function ProductsPanel({
  orgSlug,
  organizationId,
  products,
  categories,
  suppliers,
  actions,
}: ProductsPanelProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return products

    return products.filter((product) => {
      const haystack = [
        product.name,
        product.barcode ?? '',
        product.sku,
        product.categoryName ?? '',
        product.supplierName ?? '',
        product.createdByName ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [products, query])

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

      {filteredProducts.length === 0 ? (
        <div className="glass-surface mt-8 rounded-xl p-8 text-center sm:rounded-2xl">
          <Subheading level={3}>
            {products.length === 0 ? 'Sin productos' : 'Sin resultados'}
          </Subheading>
          <Text className="mt-2">
            {products.length === 0
              ? 'Registra tu primer producto con el botón de arriba.'
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
                    className="px-3 py-3.5 text-center text-sm font-semibold text-foreground!"
                  >
                    Imagen
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-center text-sm font-semibold text-foreground!"
                  >
                    Nombre
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-center text-sm font-semibold text-foreground!"
                  >
                    Precio
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-center text-sm font-semibold text-foreground!"
                  >
                    Costo
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-center text-sm font-semibold text-foreground!"
                  >
                    Stock
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-center text-sm font-semibold text-foreground!"
                  >
                    Ganancia
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-center text-sm font-semibold text-foreground!"
                  >
                    % Margen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProducts.map((product) => {
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
                              width={48}
                              height={48}
                              sizes={IMAGE_SIZES.thumbnail}
                              className="size-12 rounded-lg border border-border"
                            />
                          ) : (
                            <div
                              aria-hidden="true"
                              className="flex size-12 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-xs text-muted-foreground"
                            >
                              —
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-center text-sm font-medium whitespace-nowrap text-foreground!">
                        {product.name}
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
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateProductDialog
        orgSlug={orgSlug}
        organizationId={organizationId}
        categories={categories}
        suppliers={suppliers}
        open={isCreateOpen}
        onClose={handleCloseCreate}
      />
    </>
  )
}
