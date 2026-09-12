'use client'

import { memo } from 'react'
import { CatalogDotBadge } from '@/components/catalog-dot-badge'
import { OptimizedImage } from '@/components/optimized-image'
import { ProductInlineFields } from '@/components/productos/product-inline-fields'
import type { ProductRow } from '@/lib/data/product-types'

interface ProductsTableRowProps {
  orgSlug: string
  product: ProductRow
  canEdit: boolean
  profitLabel: string
  profitPercentLabel: string
  profitToneClass: string
  profitPercentToneClass: string
  onOpen: (productId: string) => void
}

function ProductsTableRowComponent({
  orgSlug,
  product,
  canEdit,
  profitLabel,
  profitPercentLabel,
  profitToneClass,
  profitPercentToneClass,
  onOpen,
}: ProductsTableRowProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen(product.id)
    }
  }

  return (
    <tr
      tabIndex={0}
      role="link"
      aria-label={`Ver detalle de ${product.name}`}
      onClick={() => onOpen(product.id)}
      onKeyDown={handleKeyDown}
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
        {product.tagNames.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-1">
            {product.tagNames.map((tagName) => (
              <CatalogDotBadge key={tagName}>{tagName}</CatalogDotBadge>
            ))}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>
      <ProductInlineFields
        orgSlug={orgSlug}
        product={product}
        canEdit={canEdit}
      />
      <td className={`px-3 py-4 text-center text-sm whitespace-nowrap ${profitToneClass}`}>
        {profitLabel}
      </td>
      <td className={`px-3 py-4 text-center text-sm whitespace-nowrap ${profitPercentToneClass}`}>
        {profitPercentLabel}
      </td>
    </tr>
  )
}

export const ProductsTableRow = memo(ProductsTableRowComponent)
