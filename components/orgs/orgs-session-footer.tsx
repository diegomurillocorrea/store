'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface OrgsSessionFooterProps {
  email: string
}

export function OrgsSessionFooter({ email }: OrgsSessionFooterProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  const handleSignOut = async () => {
    setIsPending(true)
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  return (
    <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
      <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{email}</p>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isPending}
        className="mt-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-white"
      >
        {isPending ? 'Saliendo…' : 'Cerrar sesión'}
      </button>
    </div>
  )
}
