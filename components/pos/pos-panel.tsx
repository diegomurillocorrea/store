'use client'

import {
  CubeIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  ShoppingCartIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useCallback, useMemo, useState } from 'react'
import type { ProductRow } from '@/lib/data/product-types'
import {
  getCartItemCount,
  getCartLineTotal,
  getCartSubtotal,
  productToCartLine,
  type PosCartLine,
} from '@/lib/pos/cart-types'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Heading, Subheading } from '@/styles/catalyst-ui-kit/heading'
import { Input, InputGroup } from '@/styles/catalyst-ui-kit/input'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface PosPanelProps {
  products: ProductRow[]
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const quantityFormatter = new Intl.NumberFormat('es-MX', {
  maximumFractionDigits: 2,
})

function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

function formatQuantity(value: number): string {
  return quantityFormatter.format(value)
}

function filterProducts(products: ProductRow[], query: string): ProductRow[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return products

  return products.filter((product) => {
    const haystack = [
      product.name,
      product.barcode ?? '',
      product.sku,
      product.categoryName ?? '',
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalizedQuery)
  })
}

function ProductCard({
  product,
  selectedQuantity,
  onAdd,
  onIncrement,
  onDecrement,
}: {
  product: ProductRow
  selectedQuantity: number
  onAdd: (product: ProductRow) => void
  onIncrement: (productId: string) => void
  onDecrement: (productId: string) => void
}) {
  const remainingQuantity = Math.max(0, product.availableQuantity - selectedQuantity)
  const isOutOfStock = product.availableQuantity <= 0
  const cannotAddMore = remainingQuantity <= 0
  const isInCart = selectedQuantity > 0
  const atMaxStock = selectedQuantity >= product.availableQuantity
  const lineTotal = selectedQuantity * product.salePrice

  const handleIncrement = () => {
    if (isOutOfStock || cannotAddMore) return
    if (selectedQuantity === 0) {
      onAdd(product)
      return
    }
    onIncrement(product.id)
  }

  return (
    <article
      className={clsx(
        'flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md dark:bg-zinc-900',
        isInCart
          ? 'border-emerald-500/70 shadow-emerald-500/10 ring-1 ring-emerald-500/20'
          : 'border-zinc-200/90 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700'
      )}
    >
      <button
        type="button"
        onClick={() => onAdd(product)}
        disabled={isOutOfStock || cannotAddMore}
        aria-label={`Agregar ${product.name} al carrito`}
        className="group relative block w-full overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-inset disabled:cursor-not-allowed"
      >
        <div className="relative aspect-5/4 w-full bg-zinc-100 dark:bg-zinc-800/60">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt=""
              className="size-full object-cover transition duration-300 group-hover:scale-[1.03] group-disabled:scale-100"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex size-full flex-col items-center justify-center gap-1 text-zinc-400"
            >
              <CubeIcon className="size-8 opacity-40" />
              <span className="text-xs">Sin imagen</span>
            </div>
          )}

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/35 to-transparent"
          />

          {isOutOfStock || cannotAddMore ? (
            <span className="absolute right-2.5 top-2.5 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white uppercase shadow-sm">
              Sin stock
            </span>
          ) : (
            <span
              aria-live="polite"
              className="absolute right-2.5 top-2.5 rounded-full bg-zinc-900/75 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white shadow-sm backdrop-blur-sm"
            >
              {formatQuantity(remainingQuantity)} disp.
            </span>
          )}

          <span className="absolute bottom-2.5 left-2.5 rounded-lg bg-white/95 px-2 py-1 text-sm font-bold tabular-nums text-emerald-700 shadow-sm backdrop-blur-sm dark:bg-zinc-950/90 dark:text-emerald-400">
            {formatCurrency(product.salePrice)}
          </span>
        </div>
      </button>

      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="min-h-0 space-y-1.5">
          <h3 className="line-clamp-2 text-sm leading-snug font-semibold text-zinc-900 dark:text-zinc-50">
            {product.name}
          </h3>
          {product.categoryName ? (
            <span className="inline-flex max-w-full truncate rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {product.categoryName}
            </span>
          ) : null}
        </div>

        <div
          className={clsx(
            'mt-auto flex items-center gap-1 rounded-xl p-1',
            isInCart
              ? 'bg-emerald-50 dark:bg-emerald-950/30'
              : 'bg-zinc-100 dark:bg-zinc-800/80'
          )}
        >
          <button
            type="button"
            onClick={() => onDecrement(product.id)}
            disabled={selectedQuantity === 0}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-white hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
            aria-label={`Reducir cantidad de ${product.name}`}
          >
            <MinusIcon className="size-4" strokeWidth={2.5} aria-hidden="true" />
          </button>

          <div className="min-w-0 flex-1 px-1 text-center">
            <span
              aria-live="polite"
              className={clsx(
                'block text-base font-bold tabular-nums',
                isInCart ? 'text-emerald-700 dark:text-emerald-300' : 'text-zinc-400'
              )}
            >
              {formatQuantity(selectedQuantity)}
            </span>
            {isInCart ? (
              <span className="block truncate text-[10px] font-medium tabular-nums text-emerald-600/80 dark:text-emerald-400/80">
                {formatCurrency(lineTotal)}
              </span>
            ) : (
              <span className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-500">
                en carrito
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleIncrement}
            disabled={isOutOfStock || cannotAddMore}
            className={clsx(
              'flex size-9 shrink-0 items-center justify-center rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-30',
              isInCart
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600'
                : 'bg-white text-emerald-700 shadow-sm hover:bg-emerald-600 hover:text-white dark:bg-zinc-700 dark:text-emerald-300 dark:hover:bg-emerald-600 dark:hover:text-white'
            )}
            aria-label={`Aumentar cantidad de ${product.name}`}
          >
            <PlusIcon className="size-4" strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  )
}

function CartLineRow({
  line,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  line: PosCartLine
  onIncrement: (productId: string) => void
  onDecrement: (productId: string) => void
  onRemove: (productId: string) => void
}) {
  const atMaxStock = line.quantity >= line.availableQuantity

  return (
    <li className="flex gap-3 border-b border-zinc-200 py-3 last:border-b-0 dark:border-zinc-800">
      <div className="shrink-0">
        {line.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={line.imageUrl}
            alt=""
            className="size-12 rounded-lg border border-zinc-200 object-cover dark:border-zinc-700"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 text-xs text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/50"
          >
            —
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{line.name}</p>
          <button
            type="button"
            onClick={() => onRemove(line.productId)}
            className="shrink-0 rounded-md p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            aria-label={`Quitar ${line.name} del carrito`}
          >
            <TrashIcon className="size-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {formatCurrency(line.unitPrice)} c/u
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => onDecrement(line.productId)}
              className="rounded-l-lg p-1.5 text-zinc-500 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:hover:bg-zinc-800"
              aria-label={`Reducir cantidad de ${line.name}`}
            >
              <MinusIcon className="size-4" aria-hidden="true" />
            </button>
            <span className="min-w-8 px-1 text-center text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatQuantity(line.quantity)}
            </span>
            <button
              type="button"
              onClick={() => onIncrement(line.productId)}
              disabled={atMaxStock}
              className="rounded-r-lg p-1.5 text-zinc-500 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-zinc-800"
              aria-label={`Aumentar cantidad de ${line.name}`}
            >
              <PlusIcon className="size-4" aria-hidden="true" />
            </button>
          </div>
          <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {formatCurrency(getCartLineTotal(line))}
          </span>
        </div>
      </div>
    </li>
  )
}

interface PosCartSidebarProps {
  cartLines: PosCartLine[]
  itemCount: number
  subtotal: number
  onIncrement: (productId: string) => void
  onDecrement: (productId: string) => void
  onRemove: (productId: string) => void
  onClear: () => void
  className?: string
}

function PosCartSidebar({
  cartLines,
  itemCount,
  subtotal,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  className = '',
}: PosCartSidebarProps) {
  return (
    <aside className={className}>
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4 sm:px-6 lg:px-8 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <ShoppingCartIcon
            className="size-5 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
          <Subheading level={3}>Carrito</Subheading>
        </div>
        {cartLines.length > 0 ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            {formatQuantity(itemCount)} {itemCount === 1 ? 'artículo' : 'artículos'}
          </span>
        ) : null}
      </div>

      {cartLines.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <ShoppingCartIcon className="size-10 text-zinc-300 dark:text-zinc-600" aria-hidden="true" />
          <Text className="mt-3">El carrito está vacío.</Text>
          <Text className="mt-1 text-sm">Toca un producto para agregarlo.</Text>
        </div>
      ) : (
        <>
          <ul className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8">
            {cartLines.map((line) => (
              <CartLineRow
                key={line.productId}
                line={line}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onRemove={onRemove}
              />
            ))}
          </ul>

          <div className="mt-auto border-t border-zinc-200 px-4 py-4 sm:px-6 lg:px-8 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <Text>Subtotal</Text>
              <span className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Button type="button" color="light" onClick={onClear} className="w-full">
                Vaciar
              </Button>
              <Button type="button" color="dark/zinc" disabled className="w-full">
                Cobrar
              </Button>
            </div>
            <Text className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
              El cobro y ticket llegarán en una siguiente etapa.
            </Text>
          </div>
        </>
      )}
    </aside>
  )
}

export function PosPanel({ products }: PosPanelProps) {
  const [query, setQuery] = useState('')
  const [cartLines, setCartLines] = useState<PosCartLine[]>([])

  const filteredProducts = useMemo(
    () => filterProducts(products, query),
    [products, query]
  )

  const subtotal = useMemo(() => getCartSubtotal(cartLines), [cartLines])
  const itemCount = useMemo(() => getCartItemCount(cartLines), [cartLines])

  const cartQuantityByProductId = useMemo(() => {
    const quantities = new Map<string, number>()
    for (const line of cartLines) {
      quantities.set(line.productId, line.quantity)
    }
    return quantities
  }, [cartLines])

  const addProduct = useCallback((product: ProductRow) => {
    if (product.availableQuantity <= 0) return

    setCartLines((current) => {
      const existingIndex = current.findIndex((line) => line.productId === product.id)

      if (existingIndex === -1) {
        return [...current, productToCartLine(product)]
      }

      const existing = current[existingIndex]
      if (existing.quantity >= product.availableQuantity) {
        return current
      }

      const next = [...current]
      next[existingIndex] = {
        ...existing,
        quantity: existing.quantity + 1,
        availableQuantity: product.availableQuantity,
      }
      return next
    })
  }, [])

  const incrementLine = useCallback((productId: string) => {
    setCartLines((current) =>
      current.map((line) => {
        if (line.productId !== productId) return line
        if (line.quantity >= line.availableQuantity) return line
        return { ...line, quantity: line.quantity + 1 }
      })
    )
  }, [])

  const decrementLine = useCallback((productId: string) => {
    setCartLines((current) =>
      current
        .map((line) => {
          if (line.productId !== productId) return line
          return { ...line, quantity: line.quantity - 1 }
        })
        .filter((line) => line.quantity > 0)
    )
  }, [])

  const removeLine = useCallback((productId: string) => {
    setCartLines((current) => current.filter((line) => line.productId !== productId))
  }, [])

  const clearCart = useCallback(() => {
    setCartLines([])
  }, [])

  const cartProps = {
    cartLines,
    itemCount,
    subtotal,
    onIncrement: incrementLine,
    onDecrement: decrementLine,
    onRemove: removeLine,
    onClear: clearCart,
  }

  return (
    <div className="relative min-h-0 flex-1">
      {/* Centro: productos con espacio reservado para el carrito fijo en xl+ */}
      <div className="xl:pr-96">
        <div className="flex min-h-[calc(100svh-5rem)] flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-6">
          <div className="shrink-0">
            <Heading>Punto de venta</Heading>
            <Text className="mt-2 max-w-2xl">
              Busca productos y agrégalos al carrito para preparar la venta.
            </Text>
          </div>

          <div className="mt-6 max-w-xl shrink-0">
            <InputGroup>
              <MagnifyingGlassIcon data-slot="icon" aria-hidden="true" />
              <Input
                type="search"
                name="pos-product-search"
                placeholder="Buscar por nombre, código o categoría"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Buscar producto"
                autoComplete="off"
              />
            </InputGroup>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="mt-6 flex flex-1 items-center justify-center rounded-xl border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-800">
              <div>
                <Subheading level={3}>
                  {products.length === 0 ? 'Sin productos' : 'Sin resultados'}
                </Subheading>
                <Text className="mt-2">
                  {products.length === 0
                    ? 'Agrega productos al catálogo para vender desde aquí.'
                    : 'Prueba con otro término de búsqueda.'}
                </Text>
              </div>
            </div>
          ) : (
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pb-6">
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <li key={product.id}>
                    <ProductCard
                      product={product}
                      selectedQuantity={cartQuantityByProductId.get(product.id) ?? 0}
                      onAdd={addProduct}
                      onIncrement={incrementLine}
                      onDecrement={decrementLine}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Carrito en flujo para pantallas menores a xl */}
          <PosCartSidebar
            {...cartProps}
            className="mt-8 flex flex-col rounded-xl border border-zinc-200 bg-white xl:hidden dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>
      </div>

      {/* Carrito fijo a la derecha (patrón Tailwind UI) */}
      <PosCartSidebar
        {...cartProps}
        className="fixed inset-y-0 right-0 z-40 hidden w-96 flex-col overflow-y-auto border-l border-zinc-200 bg-white xl:flex dark:border-zinc-800 dark:bg-zinc-950"
      />
    </div>
  )
}
