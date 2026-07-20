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
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { CatalogDotBadge } from '@/components/catalog-dot-badge'
import { useLayoutSecondaryAside } from '@/components/pos/pos-secondary-column'
import { PosCheckoutPanel } from '@/components/pos/pos-checkout-panel'
import { OptimizedImage } from '@/components/optimized-image'
import type { CustomerRow } from '@/lib/data/customer-types'
import { usePersistedPosCart } from '@/lib/hooks/use-persisted-pos-cart'
import { usePosLayout, POS_CART_TRANSITION_MS } from '@/lib/pos/pos-layout-context'
import type { ProductRow } from '@/lib/data/product-types'
import {
  getCartItemCount,
  getCartLineTotal,
  getCartSubtotal,
  productToCartLine,
  type PosCartLine,
} from '@/lib/pos/cart-types'
import {
  formatUnitPriceInput,
  parseUnitPriceInput,
  sanitizeDecimalInput,
} from '@/lib/utils/money'
import { IMAGE_SIZES } from '@/lib/utils/image-src'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { Heading, Subheading } from '@/styles/catalyst-ui-kit/heading'
import { Input, InputGroup } from '@/styles/catalyst-ui-kit/input'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface PosPanelProps {
  orgSlug: string
  products: ProductRow[]
  customers: CustomerRow[]
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

function sanitizeQuantityInput(raw: string): string {
  return raw.replace(/\D/g, '')
}

function formatQuantityInput(value: number): string {
  return String(Math.max(0, Math.floor(value)))
}

function parseQuantityInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return null

  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return null

  return parsed
}

function isActionDisabled(condition: boolean): boolean | undefined {
  return condition ? true : undefined
}

function filterProducts(
  products: ProductRow[],
  query: string,
  selectedCategories: Set<string>,
  selectedSubCategories: Set<string>
): ProductRow[] {
  const normalizedQuery = query.trim().toLowerCase()
  const hasCategoryFilter = selectedCategories.size > 0
  const hasSubCategoryFilter = selectedSubCategories.size > 0

  return products.filter((product) => {
    if (hasCategoryFilter && (!product.categoryName || !selectedCategories.has(product.categoryName))) {
      return false
    }

    if (
      hasSubCategoryFilter &&
      (!product.subCategoryName || !selectedSubCategories.has(product.subCategoryName))
    ) {
      return false
    }

    if (!normalizedQuery) return true

    const haystack = [
      product.name,
      product.barcode ?? '',
      product.sku,
      product.categoryName ?? '',
      product.subCategoryName ?? '',
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalizedQuery)
  })
}

function uniqueSortedNames(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value && value.trim())))
  ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
}

function toggleSelection(current: Set<string>, value: string): Set<string> {
  const next = new Set(current)
  if (next.has(value)) {
    next.delete(value)
  } else {
    next.add(value)
  }
  return next
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

  const isDecrementDisabled = selectedQuantity === 0
  const isIncrementDisabled = isOutOfStock || cannotAddMore

  const handleDecrement = () => {
    if (isDecrementDisabled) return
    onDecrement(product.id)
  }

  const handleIncrement = () => {
    if (isIncrementDisabled || atMaxStock) return
    if (selectedQuantity === 0) {
      onAdd(product)
      return
    }
    onIncrement(product.id)
  }

  return (
    <article
      className={clsx(
        'flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md dark:bg-zinc-900',
        isInCart
          ? 'border-emerald-500/70 shadow-emerald-500/10 ring-1 ring-emerald-500/20'
          : 'border-zinc-200/90 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700'
      )}
    >
      <button
        type="button"
        onClick={() => {
          if (isIncrementDisabled) return
          onAdd(product)
        }}
        aria-disabled={isActionDisabled(isIncrementDisabled)}
        aria-label={`Agregar ${product.name} al carrito`}
        className={clsx(
          'group relative block w-full overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-inset',
          isIncrementDisabled && 'cursor-not-allowed'
        )}
      >
        <div className="relative aspect-5/4 w-full bg-zinc-100 dark:bg-zinc-800/60">
          {product.imageUrl ? (
            <OptimizedImage
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes={IMAGE_SIZES.productCard}
              className="transition duration-200 group-hover:scale-[1.02] group-aria-disabled:scale-100"
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
        <div className="flex min-h-17 flex-col gap-1.5">
          <h3 className="line-clamp-2 min-h-10 text-sm leading-snug font-semibold text-zinc-900 dark:text-zinc-50">
            {product.name}
          </h3>
          {product.categoryName || product.subCategoryName ? (
            <div className="flex min-h-5 flex-wrap items-center gap-1.5">
              {product.categoryName ? (
                <CatalogDotBadge>{product.categoryName}</CatalogDotBadge>
              ) : null}
              {product.subCategoryName ? (
                <CatalogDotBadge>{product.subCategoryName}</CatalogDotBadge>
              ) : null}
            </div>
          ) : (
            <span className="invisible inline-flex min-h-5 max-h-5 items-center px-2 text-xs">
              Sin categoría
            </span>
          )}
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
            onClick={handleDecrement}
            aria-disabled={isActionDisabled(isDecrementDisabled)}
            className={clsx(
              'flex size-9 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-white hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white',
              isDecrementDisabled && 'cursor-not-allowed opacity-30'
            )}
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
            aria-disabled={isActionDisabled(isIncrementDisabled || atMaxStock)}
            className={clsx(
              'flex size-9 shrink-0 items-center justify-center rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50',
              isIncrementDisabled || atMaxStock
                ? 'cursor-not-allowed opacity-30'
                : isInCart
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
  onUpdatePrice,
  onUpdateQuantity,
}: {
  line: PosCartLine
  onIncrement: (productId: string) => void
  onDecrement: (productId: string) => void
  onRemove: (productId: string) => void
  onUpdatePrice: (productId: string, unitPrice: number) => void
  onUpdateQuantity: (productId: string, quantity: number) => void
}) {
  const atMaxStock = line.quantity >= line.availableQuantity
  const [priceDraft, setPriceDraft] = useState(() => formatUnitPriceInput(line.unitPrice))
  const [quantityDraft, setQuantityDraft] = useState(() => formatQuantityInput(line.quantity))

  useEffect(() => {
    setPriceDraft(formatUnitPriceInput(line.unitPrice))
  }, [line.unitPrice])

  useEffect(() => {
    setQuantityDraft(formatQuantityInput(line.quantity))
  }, [line.quantity])

  function commitPrice() {
    const nextPrice = parseUnitPriceInput(priceDraft)
    if (nextPrice == null) {
      setPriceDraft(formatUnitPriceInput(line.unitPrice))
      return
    }

    setPriceDraft(formatUnitPriceInput(nextPrice))
    if (nextPrice !== line.unitPrice) {
      onUpdatePrice(line.productId, nextPrice)
    }
  }

  function commitQuantity() {
    const parsed = parseQuantityInput(quantityDraft)
    if (parsed == null) {
      setQuantityDraft(formatQuantityInput(line.quantity))
      return
    }

    const maxQuantity = Math.max(0, Math.floor(line.availableQuantity))
    const nextQuantity = Math.min(parsed, maxQuantity)

    if (nextQuantity <= 0) {
      onRemove(line.productId)
      return
    }

    setQuantityDraft(formatQuantityInput(nextQuantity))
    if (nextQuantity !== line.quantity) {
      onUpdateQuantity(line.productId, nextQuantity)
    }
  }

  return (
    <li className="flex gap-3 border-b border-zinc-200 py-3 last:border-b-0 dark:border-zinc-800">
      <div className="shrink-0">
        {line.imageUrl ? (
          <OptimizedImage
            src={line.imageUrl}
            alt={line.name}
            width={48}
            height={48}
            sizes={IMAGE_SIZES.thumbnail}
            className="size-12 rounded-lg border border-zinc-200 dark:border-zinc-700"
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
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-xs text-zinc-500 dark:text-zinc-400" aria-hidden="true">
            $
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={priceDraft}
            onChange={(event) => setPriceDraft(sanitizeDecimalInput(event.target.value))}
            onBlur={commitPrice}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur()
              }
            }}
            aria-label={`Precio unitario de ${line.name}`}
            className="w-24 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs tabular-nums text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400"
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">c/u</span>
        </div>
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
            <input
              type="text"
              inputMode="numeric"
              value={quantityDraft}
              onChange={(event) => setQuantityDraft(sanitizeQuantityInput(event.target.value))}
              onBlur={commitQuantity}
              onFocus={(event) => event.currentTarget.select()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur()
                }
              }}
              aria-label={`Cantidad de ${line.name}`}
              className="w-12 min-w-8 border-x border-zinc-200 bg-transparent px-1 py-1 text-center text-sm font-medium tabular-nums text-zinc-900 outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-emerald-500/30 dark:border-zinc-700 dark:text-zinc-100 dark:focus:bg-zinc-900"
            />
            <button
              type="button"
              onClick={() => {
                if (atMaxStock) return
                onIncrement(line.productId)
              }}
              aria-disabled={isActionDisabled(atMaxStock)}
              className={clsx(
                'rounded-r-lg p-1.5 text-zinc-500 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:hover:bg-zinc-800',
                atMaxStock && 'cursor-not-allowed opacity-40'
              )}
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
  orgSlug: string
  customers: CustomerRow[]
  onIncrement: (productId: string) => void
  onDecrement: (productId: string) => void
  onRemove: (productId: string) => void
  onUpdatePrice: (productId: string, unitPrice: number) => void
  onUpdateQuantity: (productId: string, quantity: number) => void
  onClear: () => void
  onSaleComplete: () => void
  className?: string
}

function PosCartSidebar({
  cartLines,
  itemCount,
  subtotal,
  orgSlug,
  customers,
  onIncrement,
  onDecrement,
  onRemove,
  onUpdatePrice,
  onUpdateQuantity,
  onClear,
  onSaleComplete,
  className = '',
}: PosCartSidebarProps) {
  const [step, setStep] = useState<'cart' | 'checkout'>('cart')

  useEffect(() => {
    if (cartLines.length === 0) {
      setStep('cart')
    }
  }, [cartLines.length])

  if (step === 'checkout' && cartLines.length > 0) {
    return (
      <PosCheckoutPanel
        orgSlug={orgSlug}
        cartLines={cartLines}
        subtotal={subtotal}
        customers={customers}
        onBack={() => setStep('cart')}
        onSaleComplete={onSaleComplete}
        formatCurrency={formatCurrency}
        className={className}
      />
    )
  }

  return (
    <div className={className}>
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
          <div className="border-b border-zinc-200 px-4 py-3 sm:px-6 lg:px-8 dark:border-zinc-800">
            <Button type="button" color="light" onClick={onClear} className="w-full">
              Vaciar
            </Button>
          </div>

          <ul className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8">
            {cartLines.map((line) => (
              <CartLineRow
                key={line.productId}
                line={line}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onRemove={onRemove}
                onUpdatePrice={onUpdatePrice}
                onUpdateQuantity={onUpdateQuantity}
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
            <Button
              type="button"
              color="dark/zinc"
              className="mt-4 w-full"
              onClick={() => setStep('checkout')}
            >
              Continuar
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export function PosPanel({ orgSlug, products, customers }: PosPanelProps) {
  const [query, setQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(() => new Set())
  const [selectedSubCategories, setSelectedSubCategories] = useState<Set<string>>(
    () => new Set()
  )
  const [cartLines, setCartLines] = usePersistedPosCart(orgSlug, products)
  const posLayout = usePosLayout()
  const mobileCartRef = useRef<HTMLDivElement>(null)
  const previousItemCountRef = useRef(0)

  const categoryNames = useMemo(
    () => uniqueSortedNames(products.map((product) => product.categoryName)),
    [products]
  )

  const subCategoryNames = useMemo(
    () => uniqueSortedNames(products.map((product) => product.subCategoryName)),
    [products]
  )

  const filteredProducts = useMemo(
    () => filterProducts(products, query, selectedCategories, selectedSubCategories),
    [products, query, selectedCategories, selectedSubCategories]
  )

  const subtotal = useMemo(() => getCartSubtotal(cartLines), [cartLines])
  const itemCount = useMemo(() => getCartItemCount(cartLines), [cartLines])
  const cartColumnVisible = posLayout?.cartColumnVisible ?? false

  useLayoutEffect(() => {
    if (!posLayout) return
    posLayout.setCartItemCount(itemCount)
    if (itemCount > 0) {
      posLayout.setCartColumnVisible(true)
    }
  }, [itemCount, posLayout])

  useEffect(() => {
    if (!posLayout || itemCount > 0) return undefined

    const timer = window.setTimeout(() => {
      posLayout.setCartColumnVisible(false)
    }, POS_CART_TRANSITION_MS)

    return () => window.clearTimeout(timer)
  }, [itemCount, posLayout])

  useEffect(() => {
    if (itemCount > previousItemCountRef.current && itemCount > 0) {
      mobileCartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    previousItemCountRef.current = itemCount
  }, [itemCount])

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

  const updateLinePrice = useCallback((productId: string, unitPrice: number) => {
    setCartLines((current) =>
      current.map((line) => {
        if (line.productId !== productId) return line
        return { ...line, unitPrice }
      })
    )
  }, [])

  const updateLineQuantity = useCallback((productId: string, quantity: number) => {
    setCartLines((current) =>
      current
        .map((line) => {
          if (line.productId !== productId) return line

          const maxQuantity = Math.max(0, Math.floor(line.availableQuantity))
          const nextQuantity = Math.min(Math.max(0, Math.floor(quantity)), maxQuantity)

          return { ...line, quantity: nextQuantity }
        })
        .filter((line) => line.quantity > 0)
    )
  }, [])

  const clearCart = useCallback(() => {
    setCartLines([])
  }, [])

  const handleSaleComplete = useCallback(() => {
    setCartLines([])
    setSelectedCategories(new Set())
    setSelectedSubCategories(new Set())
  }, [])

  const cartProps = {
    cartLines,
    itemCount,
    subtotal,
    orgSlug,
    customers,
    onIncrement: incrementLine,
    onDecrement: decrementLine,
    onRemove: removeLine,
    onUpdatePrice: updateLinePrice,
    onUpdateQuantity: updateLineQuantity,
    onClear: clearCart,
    onSaleComplete: handleSaleComplete,
  }

  const desktopCart = useMemo(
    () => (
      <PosCartSidebar
        {...cartProps}
        className="flex h-full min-h-0 flex-col"
      />
    ),
    [cartLines, itemCount, subtotal, orgSlug, customers, incrementLine, decrementLine, removeLine, updateLinePrice, updateLineQuantity, clearCart, handleSaleComplete]
  )

  const secondaryAsidePortal = useLayoutSecondaryAside(desktopCart, cartColumnVisible)

  return (
    <>
      {secondaryAsidePortal}
      <div className="flex h-[calc(100dvh-4.5rem)] min-h-0 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:h-[calc(100dvh-1rem)] lg:px-8 lg:py-6">
          <div className="shrink-0">
            <Heading>Punto de venta</Heading>
            <Text className="mt-2 max-w-2xl">
              Busca productos y agrégalos al carrito para preparar la venta.
            </Text>
          </div>

          <div className="mt-6 w-full shrink-0 space-y-3">
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

            {categoryNames.length > 0 ? (
              <div className="-mx-1 overflow-x-auto px-1">
                <div
                  role="group"
                  aria-label="Filtrar por categoría"
                  className="flex w-max min-w-full flex-nowrap items-center gap-1.5"
                >
                  {categoryNames.map((name) => {
                    const isSelected = selectedCategories.has(name)
                    return (
                      <CatalogDotBadge
                        key={name}
                        selected={isSelected}
                        dimmed={selectedCategories.size > 0 && !isSelected}
                        onClick={() => {
                          setSelectedCategories((current) => toggleSelection(current, name))
                        }}
                      >
                        {name}
                      </CatalogDotBadge>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {subCategoryNames.length > 0 ? (
              <div className="-mx-1 overflow-x-auto px-1">
                <div
                  role="group"
                  aria-label="Filtrar por subcategoría"
                  className="flex w-max min-w-full flex-nowrap items-center gap-1.5"
                >
                  {subCategoryNames.map((name) => {
                    const isSelected = selectedSubCategories.has(name)
                    return (
                      <CatalogDotBadge
                        key={name}
                        selected={isSelected}
                        dimmed={selectedSubCategories.size > 0 && !isSelected}
                        onClick={() => {
                          setSelectedSubCategories((current) => toggleSelection(current, name))
                        }}
                      >
                        {name}
                      </CatalogDotBadge>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="mt-6 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-800">
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
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
              <ul className="grid auto-rows-fr grid-cols-2 items-stretch gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredProducts.map((product) => (
                  <li key={product.id} className="h-full min-h-0">
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

          {/* Carrito en flujo para pantallas menores a lg */}
          <div
            ref={mobileCartRef}
            aria-hidden={!cartColumnVisible}
            style={{ transitionDuration: `${POS_CART_TRANSITION_MS}ms` }}
            className={clsx(
              'grid shrink-0 overflow-hidden transition-[grid-template-rows,opacity,margin-top] ease-in-out lg:hidden',
              cartColumnVisible ? 'mt-8 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <PosCartSidebar
                {...cartProps}
                className="flex flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>
          </div>
      </div>
    </>
  )
}
