'use client'

import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'
import { CreateProductDialog } from '@/components/productos/create-product-dialog'
import { DeleteProductDialog } from '@/components/productos/delete-product-dialog'
import { EditProductDialog } from '@/components/productos/edit-product-dialog'
import type { ProductOption, ProductRow } from '@/lib/data/product-types'
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
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const quantityFormatter = new Intl.NumberFormat('es-MX', {
  maximumFractionDigits: 2,
})

const percentFormatter = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

function formatCurrency(value: number | null): string {
  if (value == null) return '—'
  return currencyFormatter.format(value)
}

function formatQuantity(value: number): string {
  return quantityFormatter.format(value)
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
}: ProductsPanelProps) {
  const [query, setQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<ProductRow | null>(null)

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
  const handleCloseEdit = () => setEditingProduct(null)
  const handleCloseDelete = () => setDeletingProduct(null)

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
          <Button type="button" color="dark/zinc" onClick={handleOpenCreate}>
            <PlusIcon data-slot="icon" aria-hidden="true" />
            Nuevo producto
          </Button>
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
                    className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-foreground! sm:pl-6"
                  >
                    Imagen
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-foreground!"
                  >
                    Nombre
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-foreground!"
                  >
                    Precio
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-foreground!"
                  >
                    Costo
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-foreground!"
                  >
                    Stock
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-foreground!"
                  >
                    Ganancia
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-foreground!"
                  >
                    % Margen
                  </th>
                  <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-6">
                    <span className="sr-only">Acciones</span>
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
                  <tr key={product.id}>
                    <td className="py-4 pr-3 pl-4 sm:pl-6">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="size-12 rounded-lg border border-border object-cover"
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          className="flex size-12 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-xs text-muted-foreground"
                        >
                          —
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-4 text-sm font-medium whitespace-nowrap text-foreground!">
                      {product.name}
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-foreground!">
                      {formatCurrency(product.salePrice)}
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-foreground!">
                      {formatCurrency(product.costPrice)}
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-foreground!">
                      {formatQuantity(product.availableQuantity)}
                    </td>
                    <td
                      className={`px-3 py-4 text-sm whitespace-nowrap ${profitToneClass(profit)}`}
                    >
                      {formatCurrency(profit)}
                    </td>
                    <td
                      className={`px-3 py-4 text-sm whitespace-nowrap ${profitToneClass(profitPercent)}`}
                    >
                      {formatProfitPercent(profitPercent)}
                    </td>
                    <td className="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                      <div className="flex items-center justify-end gap-4">
                        <button
                          type="button"
                          onClick={() => setEditingProduct(product)}
                          className="text-emerald-600 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:text-emerald-400 dark:hover:text-emerald-300"
                        >
                          Editar
                          <span className="sr-only">, {product.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingProduct(product)}
                          className="text-red-600 hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Eliminar
                          <span className="sr-only">, {product.name}</span>
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

      <CreateProductDialog
        orgSlug={orgSlug}
        organizationId={organizationId}
        categories={categories}
        suppliers={suppliers}
        open={isCreateOpen}
        onClose={handleCloseCreate}
      />

      <EditProductDialog
        orgSlug={orgSlug}
        organizationId={organizationId}
        product={editingProduct}
        categories={categories}
        suppliers={suppliers}
        open={editingProduct !== null}
        onClose={handleCloseEdit}
      />

      <DeleteProductDialog
        orgSlug={orgSlug}
        product={deletingProduct}
        open={deletingProduct !== null}
        onClose={handleCloseDelete}
      />
    </>
  )
}
