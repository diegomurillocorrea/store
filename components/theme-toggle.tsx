'use client'

import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import { useCallback, useEffect, useState, type KeyboardEvent } from 'react'
import { UI_THEME_STORAGE_KEY } from '@/lib/theme/ui-theme'

const applyDarkClass = (isDark: boolean) => {
  const root = document.documentElement
  if (isDark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const handleToggle = useCallback(() => {
    const nextDark = !document.documentElement.classList.contains('dark')
    applyDarkClass(nextDark)
    localStorage.setItem(UI_THEME_STORAGE_KEY, nextDark ? 'dark' : 'light')
    setIsDark(nextDark)
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleToggle()
      }
    },
    [handleToggle]
  )

  if (!mounted) {
    return (
      <span
        className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface/95 shadow-sm backdrop-blur-sm"
        aria-hidden
      />
    )
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      aria-pressed={isDark}
      className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface/95 text-foreground shadow-sm backdrop-blur-sm transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {isDark ? (
        <SunIcon className="size-5" aria-hidden data-slot="icon" />
      ) : (
        <MoonIcon className="size-5" aria-hidden data-slot="icon" />
      )}
    </button>
  )
}
