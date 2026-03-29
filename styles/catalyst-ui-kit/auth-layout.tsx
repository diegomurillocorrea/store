import type React from 'react'

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="glass-shell flex min-h-dvh flex-col p-3 sm:p-4">
      <div className="glass-surface flex flex-1 flex-col items-center justify-center rounded-2xl p-6 sm:rounded-3xl lg:p-10">
        {children}
      </div>
    </main>
  )
}
