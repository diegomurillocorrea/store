'use client'

import { useLayoutEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { LAYOUT_SECONDARY_ASIDE_ID } from '@/styles/catalyst-ui-kit/sidebar-layout'

export function useLayoutSecondaryAside(content: React.ReactNode) {
  const [asideRoot, setAsideRoot] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    setAsideRoot(document.getElementById(LAYOUT_SECONDARY_ASIDE_ID))
  }, [])

  const portal = useMemo(() => {
    if (!asideRoot) return null
    return createPortal(content, asideRoot)
  }, [asideRoot, content])

  return portal
}
