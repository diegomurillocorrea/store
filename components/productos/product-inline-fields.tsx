'use client'

import { startTransition, useActionState, useEffect, useRef, useState } from 'react'
import {
  updateProductQuickFieldsAction,
  type ProductFormState,
} from '@/lib/actions/product-actions'
import type { ProductRow } from '@/lib/data/product-types'
import { useFormActionSuccess } from '@/lib/hooks/use-form-action-success'

const initialState: ProductFormState = { error: null, ok: false }

interface ProductInlineFieldsProps {
  orgSlug: string
  product: ProductRow
  canEdit: boolean
}

function toInputValue(value: number | null): string {
  if (value == null) return ''
  return String(value)
}

export function ProductInlineFields({
  orgSlug,
  product,
  canEdit,
}: ProductInlineFieldsProps) {
  const boundAction = updateProductQuickFieldsAction.bind(null, orgSlug, product.id)
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  const [salePrice, setSalePrice] = useState(toInputValue(product.salePrice))
  const [costPrice, setCostPrice] = useState(toInputValue(product.costPrice))
  const [availableQuantity, setAvailableQuantity] = useState(
    toInputValue(product.availableQuantity)
  )

  const salePriceRef = useRef(salePrice)
  const costPriceRef = useRef(costPrice)
  const availableQuantityRef = useRef(availableQuantity)

  salePriceRef.current = salePrice
  costPriceRef.current = costPrice
  availableQuantityRef.current = availableQuantity

  useEffect(() => {
    setSalePrice(toInputValue(product.salePrice))
    setCostPrice(toInputValue(product.costPrice))
    setAvailableQuantity(toInputValue(product.availableQuantity))
  }, [product.salePrice, product.costPrice, product.availableQuantity])

  useFormActionSuccess(state.ok, () => {}, pending)

  const submitValues = () => {
    if (!canEdit || pending) return

    const formData = new FormData()
    formData.set('salePrice', salePriceRef.current)
    formData.set('costPrice', costPriceRef.current)
    formData.set('availableQuantity', availableQuantityRef.current)
    startTransition(() => {
      formAction(formData)
    })
  }

  const stopRowNavigation = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.stopPropagation()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    stopRowNavigation(event)
    if (event.key === 'Enter') {
      event.currentTarget.blur()
    }
  }

  const inputClassName =
    'w-full min-w-[5.5rem] rounded-md border border-transparent bg-transparent px-2 py-1 text-center text-sm text-foreground! transition hover:border-border focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-default disabled:opacity-70 dark:focus:bg-zinc-900'

  if (!canEdit) {
    return (
      <>
        <td className="px-3 py-4 text-center text-sm whitespace-nowrap text-foreground!">
          {product.salePrice.toFixed(2)}
        </td>
        <td className="px-3 py-4 text-center text-sm whitespace-nowrap text-foreground!">
          {product.costPrice != null ? product.costPrice.toFixed(2) : '—'}
        </td>
        <td className="px-3 py-4 text-center text-sm whitespace-nowrap text-foreground!">
          {product.availableQuantity}
        </td>
      </>
    )
  }

  return (
    <>
      <td className="px-3 py-4 text-center text-sm whitespace-nowrap text-foreground!">
        <input
          type="text"
          inputMode="decimal"
          aria-label={`Precio de ${product.name}`}
          value={salePrice}
          disabled={pending}
          onChange={(event) => setSalePrice(event.target.value)}
          onBlur={submitValues}
          onClick={stopRowNavigation}
          onKeyDown={handleKeyDown}
          className={inputClassName}
        />
      </td>
      <td className="px-3 py-4 text-center text-sm whitespace-nowrap text-foreground!">
        <input
          type="text"
          inputMode="decimal"
          aria-label={`Costo de ${product.name}`}
          value={costPrice}
          disabled={pending}
          onChange={(event) => setCostPrice(event.target.value)}
          onBlur={submitValues}
          onClick={stopRowNavigation}
          onKeyDown={handleKeyDown}
          placeholder="—"
          className={inputClassName}
        />
      </td>
      <td className="px-3 py-4 text-center text-sm whitespace-nowrap text-foreground!">
        <input
          type="text"
          inputMode="decimal"
          aria-label={`Stock de ${product.name}`}
          value={availableQuantity}
          disabled={pending}
          onChange={(event) => setAvailableQuantity(event.target.value)}
          onBlur={submitValues}
          onClick={stopRowNavigation}
          onKeyDown={handleKeyDown}
          className={inputClassName}
        />
        {state.error ? (
          <span className="mt-1 block text-center text-xs text-red-600 dark:text-red-400" role="alert">
            {state.error}
          </span>
        ) : null}
      </td>
    </>
  )
}
