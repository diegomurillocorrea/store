import type { ProductRow } from '@/lib/data/product-types'

export interface PosCartLine {
  productId: string
  name: string
  unitPrice: number
  quantity: number
  imageUrl: string | null
  availableQuantity: number
}

export function productToCartLine(product: ProductRow, quantity = 1): PosCartLine {
  return {
    productId: product.id,
    name: product.name,
    unitPrice: product.salePrice,
    quantity,
    imageUrl: product.imageUrl,
    availableQuantity: product.availableQuantity,
  }
}

export function getCartLineTotal(line: PosCartLine): number {
  return line.unitPrice * line.quantity
}

export function getCartSubtotal(lines: PosCartLine[]): number {
  return lines.reduce((sum, line) => sum + getCartLineTotal(line), 0)
}

export function getCartItemCount(lines: PosCartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0)
}
