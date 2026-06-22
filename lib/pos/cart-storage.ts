import type { ProductRow } from '@/lib/data/product-types'
import { productToCartLine, type PosCartLine } from '@/lib/pos/cart-types'

const STORAGE_PREFIX = 'store:pos-cart:'

interface StoredCartLine {
  productId: string
  quantity: number
}

function getStorageKey(orgSlug: string): string {
  return `${STORAGE_PREFIX}${orgSlug}`
}

function parseStoredCart(raw: string | null): StoredCartLine[] {
  if (!raw) return []

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.flatMap((entry) => {
      if (
        typeof entry !== 'object' ||
        entry === null ||
        typeof (entry as StoredCartLine).productId !== 'string' ||
        typeof (entry as StoredCartLine).quantity !== 'number'
      ) {
        return []
      }

      const { productId, quantity } = entry as StoredCartLine
      if (!Number.isFinite(quantity) || quantity <= 0) return []

      return [{ productId, quantity }]
    })
  } catch {
    return []
  }
}

export function restorePosCart(orgSlug: string, products: ProductRow[]): PosCartLine[] {
  if (typeof window === 'undefined') return []

  const stored = parseStoredCart(localStorage.getItem(getStorageKey(orgSlug)))
  if (stored.length === 0) return []

  const productById = new Map(products.map((product) => [product.id, product]))

  return stored.flatMap(({ productId, quantity }) => {
    const product = productById.get(productId)
    if (!product || product.availableQuantity <= 0) return []

    const safeQuantity = Math.min(
      Math.max(1, Math.floor(quantity)),
      product.availableQuantity
    )

    return [productToCartLine(product, safeQuantity)]
  })
}

export function persistPosCart(orgSlug: string, lines: PosCartLine[]): void {
  if (typeof window === 'undefined') return

  const payload: StoredCartLine[] = lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
  }))

  const key = getStorageKey(orgSlug)

  if (payload.length === 0) {
    localStorage.removeItem(key)
    return
  }

  localStorage.setItem(key, JSON.stringify(payload))
}

export function syncPosCartWithProducts(
  lines: PosCartLine[],
  products: ProductRow[]
): PosCartLine[] {
  const productById = new Map(products.map((product) => [product.id, product]))

  return lines.flatMap((line) => {
    const product = productById.get(line.productId)
    if (!product || product.availableQuantity <= 0) return []

    const quantity = Math.min(line.quantity, product.availableQuantity)

    return [
      {
        ...line,
        name: product.name,
        unitPrice: product.salePrice,
        imageUrl: product.imageUrl,
        availableQuantity: product.availableQuantity,
        quantity,
      },
    ]
  })
}
