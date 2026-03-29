'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { NavbarItem } from '@/styles/catalyst-ui-kit/navbar'

interface SignOutButtonProps {
  className?: string
  children?: React.ReactNode
}

export function SignOutButton({ className, children }: SignOutButtonProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const handleSignOut = async () => {
    setPending(true)
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  return (
    <NavbarItem
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      aria-label="Cerrar sesión"
      className={className}
    >
      {children ?? (pending ? 'Saliendo…' : 'Cerrar sesión')}
    </NavbarItem>
  )
}
