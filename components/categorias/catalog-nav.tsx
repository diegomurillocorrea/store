'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

interface CatalogNavProps {
  orgSlug: string
}

const tabs = [
  { href: 'categorias', label: 'Categorías' },
  { href: 'categorias/sub-categorias', label: 'Subcategorías' },
] as const

export function CatalogNav({ orgSlug }: CatalogNavProps) {
  const pathname = usePathname()
  const base = `/${orgSlug}`

  return (
    <nav
      aria-label="Secciones de catálogo"
      className="mt-6 flex gap-1 rounded-xl border border-border bg-white/50 p-1 dark:bg-white/5"
    >
      {tabs.map((tab) => {
        const href = `${base}/${tab.href}`
        const isActive =
          tab.href === 'categorias'
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`)

        return (
          <Link
            key={tab.href}
            href={href}
            className={clsx(
              'flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium transition',
              isActive
                ? 'bg-emerald-600 text-white shadow-sm dark:bg-emerald-500'
                : 'text-muted-foreground hover:bg-zinc-100 hover:text-foreground dark:hover:bg-white/10'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
