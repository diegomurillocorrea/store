'use client'

import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface PosCartSheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export function PosCartSheet ({
  open,
  onClose,
  children,
}: PosCartSheetProps) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setPortalRoot(document.body)
  }, [])

  if (!portalRoot) return null

  return createPortal(
    <div className="xl:hidden">
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/60',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        aria-label="Carrito"
        aria-hidden={!open}
        className={clsx(
          'fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-zinc-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out sm:max-w-md dark:border-zinc-800 dark:bg-zinc-900',
          !open && 'pointer-events-none'
        )}
        style={{ transform: open ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </aside>
    </div>,
    portalRoot
  )
}
