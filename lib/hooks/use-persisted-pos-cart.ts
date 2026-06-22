'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type { ProductRow } from '@/lib/data/product-types'
import type { PosCartLine } from '@/lib/pos/cart-types'
import {
  persistPosCart,
  restorePosCart,
  syncPosCartWithProducts,
} from '@/lib/pos/cart-storage'

export function usePersistedPosCart(
  orgSlug: string,
  products: ProductRow[]
): [PosCartLine[], Dispatch<SetStateAction<PosCartLine[]>>, boolean] {
  const [cartLines, setCartLines] = useState<PosCartLine[]>([])
  const [isReady, setIsReady] = useState(false)
  const hasRestoredRef = useRef(false)

  useEffect(() => {
    hasRestoredRef.current = false
    setIsReady(false)
    setCartLines(restorePosCart(orgSlug, products))
    hasRestoredRef.current = true
    setIsReady(true)
  }, [orgSlug])

  useEffect(() => {
    if (!hasRestoredRef.current) return
    setCartLines((current) => syncPosCartWithProducts(current, products))
  }, [products])

  useEffect(() => {
    if (!isReady) return
    persistPosCart(orgSlug, cartLines)
  }, [orgSlug, cartLines, isReady])

  const setPersistedCartLines = useCallback<Dispatch<SetStateAction<PosCartLine[]>>>(
    (value) => {
      setCartLines(value)
    },
    []
  )

  return [cartLines, setPersistedCartLines, isReady]
}
