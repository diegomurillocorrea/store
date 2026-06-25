'use client'

import { createContext, useContext, useMemo, useState } from 'react'

export const POS_CART_TRANSITION_MS = 300

interface PosLayoutContextValue {
  cartItemCount: number
  setCartItemCount: (count: number) => void
  cartColumnVisible: boolean
  setCartColumnVisible: (visible: boolean) => void
}

const PosLayoutContext = createContext<PosLayoutContextValue | null>(null)

export function PosLayoutProvider({ children }: { children: React.ReactNode }) {
  const [cartItemCount, setCartItemCount] = useState(0)
  const [cartColumnVisible, setCartColumnVisible] = useState(false)

  const value = useMemo(
    () => ({
      cartItemCount,
      setCartItemCount,
      cartColumnVisible,
      setCartColumnVisible,
    }),
    [cartItemCount, cartColumnVisible]
  )

  return <PosLayoutContext.Provider value={value}>{children}</PosLayoutContext.Provider>
}

export function usePosLayout() {
  return useContext(PosLayoutContext)
}
