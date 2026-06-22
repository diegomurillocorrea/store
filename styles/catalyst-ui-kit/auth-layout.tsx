import type React from 'react'
import { AuthHeroPanel } from '@/components/auth/auth-hero-panel'
import { ThemeToggleCorner } from '@/components/theme-toggle-corner'

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh bg-white dark:bg-zinc-950">
      <ThemeToggleCorner />
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">{children}</div>
      </div>
      <AuthHeroPanel />
    </div>
  )
}
