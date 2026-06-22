'use client'

import { ThemeToggle } from '@/components/theme-toggle'

export function ThemeToggleCorner() {
  return (
    <div className="absolute right-4 top-4 z-10 sm:right-5 sm:top-5">
      <ThemeToggle />
    </div>
  )
}
