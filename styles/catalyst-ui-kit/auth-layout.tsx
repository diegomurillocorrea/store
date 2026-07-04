import type React from 'react'
import Link from 'next/link'
import { DaiegoLogo } from '@/components/daiego-logo'
import { ThemeToggleCorner } from '@/components/theme-toggle-corner'
import { AuthCardReveal } from '@/components/auth/auth-card-reveal'

interface AuthLayoutProps {
  children: React.ReactNode
  background?: React.ReactNode
  animated?: boolean
}

export function AuthLayout({ children, background, animated = false }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-dvh overflow-hidden bg-white dark:bg-zinc-950">
      {background}
      <ThemeToggleCorner />
      <div className="relative z-10 flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
        <AuthCardReveal animated={animated} className="mx-auto w-full max-w-sm lg:w-96">
          <Link href="/" className="inline-flex items-center gap-2.5" data-auth-reveal>
            <DaiegoLogo size={40} />
            <span className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
              DAIEGO Store
            </span>
          </Link>
          <div className="mt-8" data-auth-reveal>
            {children}
          </div>
        </AuthCardReveal>
      </div>
    </div>
  )
}
