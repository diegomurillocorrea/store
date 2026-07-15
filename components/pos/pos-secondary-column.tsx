'use client'

import { useLayoutEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { LAYOUT_SECONDARY_ASIDE_ID } from '@/styles/catalyst-ui-kit/sidebar-layout'

function findSecondaryAsideRoot (): HTMLElement | null {
  return document.getElementById(LAYOUT_SECONDARY_ASIDE_ID)
}

export function useLayoutSecondaryAside (content: React.ReactNode, enabled = true) {
  const [asideRoot, setAsideRoot] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    if (!enabled) {
      setAsideRoot(null)
      return
    }

    // En POS el aside ya está montado (reserveSecondaryColumn); no hace falta
    // MutationObserver en document.body (disparaba en casi cualquier mutación del DOM).
    setAsideRoot(findSecondaryAsideRoot())
  }, [enabled])

  const portal = useMemo(() => {
    if (!enabled || !asideRoot) return null
    return createPortal(content, asideRoot)
  }, [asideRoot, content, enabled])

  return portal
}
