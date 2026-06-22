'use client'

import { AuthStoreScene } from '@/components/auth/auth-store-scene'

export function AuthHeroPanel() {
  return (
    <div className="relative hidden w-0 flex-1 overflow-hidden bg-black lg:block">
      <AuthStoreScene />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-white/25 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-[#5c6b72]/90 to-transparent" />
      <div className="pointer-events-none absolute inset-x-8 bottom-8">
        <p className="text-sm font-medium tracking-wide text-emerald-400/90">POS e inventario</p>
        <p className="mt-1 max-w-xs text-2xl font-semibold tracking-tight text-white">
          Tu tienda, bajo control
        </p>
      </div>
    </div>
  )
}
