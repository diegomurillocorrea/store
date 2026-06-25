'use client'

import { useLayoutEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { LAYOUT_SECONDARY_ASIDE_ID } from '@/styles/catalyst-ui-kit/sidebar-layout'

function findSecondaryAsideRoot(): HTMLElement | null {
  return document.getElementById(LAYOUT_SECONDARY_ASIDE_ID)
}

export function useLayoutSecondaryAside(content: React.ReactNode, enabled = true) {
  const [asideRoot, setAsideRoot] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    if (!enabled) {
      setAsideRoot(null)
      return
    }

    function syncAsideRoot() {
      const nextRoot = findSecondaryAsideRoot()
      setAsideRoot((current) => (current === nextRoot ? current : nextRoot))
    }

    syncAsideRoot()

    const observer = new MutationObserver(syncAsideRoot)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [enabled])

  const portal = useMemo(() => {
    if (!enabled || !asideRoot) return null
    return createPortal(content, asideRoot)
  }, [asideRoot, content, enabled])

  return portal
}
