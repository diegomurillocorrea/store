import type React from 'react'

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col bg-background p-2">
      <div className="flex grow items-center justify-center p-6 lg:rounded-lg lg:bg-surface lg:p-10 lg:shadow-xs lg:ring-1 lg:ring-border/70 dark:lg:ring-border/80">
        {children}
      </div>
    </main>
  )
}
