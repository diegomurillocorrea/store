'use client'

import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/styles/catalyst-ui-kit/button'
import { NavbarItem } from '@/styles/catalyst-ui-kit/navbar'
import { SidebarItem, SidebarLabel } from '@/styles/catalyst-ui-kit/sidebar'

interface SignOutButtonProps {
  className?: string
  children?: React.ReactNode
  variant?: 'navbar' | 'sidebar' | 'button'
}

export function SignOutButton({
  className,
  children,
  variant = 'navbar',
}: SignOutButtonProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const label = children ?? (pending ? 'Saliendo…' : 'Cerrar sesión')

  const handleSignOut = async () => {
    setPending(true)
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  if (variant === 'button') {
    return (
      <Button
        type="button"
        plain
        onClick={handleSignOut}
        disabled={pending}
        aria-label="Cerrar sesión"
        className={className}
      >
        <ArrowRightStartOnRectangleIcon data-slot="icon" aria-hidden="true" />
        {label}
      </Button>
    )
  }

  if (variant === 'sidebar') {
    return (
      <SidebarItem
        type="button"
        onClick={handleSignOut}
        disabled={pending}
        aria-label="Cerrar sesión"
        className={className}
      >
        <ArrowRightStartOnRectangleIcon data-slot="icon" aria-hidden="true" />
        <SidebarLabel>{label}</SidebarLabel>
      </SidebarItem>
    )
  }

  return (
    <NavbarItem
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      aria-label="Cerrar sesión"
      className={className}
    >
      <ArrowRightStartOnRectangleIcon data-slot="icon" aria-hidden="true" />
      {label}
    </NavbarItem>
  )
}
