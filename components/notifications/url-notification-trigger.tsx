'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useNotifications } from '@/components/notifications/notification-provider'

interface UrlNotificationTriggerProps {
  param: string
  value: string
  title: string
  description?: string
}

/** Muestra una notificación cuando la URL incluye un parámetro de confirmación. */
export function UrlNotificationTrigger({
  param,
  value,
  title,
  description,
}: UrlNotificationTriggerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { notify } = useNotifications()
  const hasShownRef = useRef(false)

  useEffect(() => {
    if (hasShownRef.current) return
    if (searchParams.get(param) !== value) return

    hasShownRef.current = true
    notify({ title, description, variant: 'success' })

    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete(param)
    const query = nextParams.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [description, notify, param, pathname, router, searchParams, title, value])

  return null
}
