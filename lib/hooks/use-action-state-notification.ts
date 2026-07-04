'use client'

import { useEffect, useRef } from 'react'
import { useNotifications, type NotificationInput } from '@/components/notifications/notification-provider'

/** Muestra una notificación global tras un server action exitoso. */
export function useActionStateNotification(
  isOk: boolean,
  pending: boolean,
  title: string,
  options?: Omit<NotificationInput, 'title'>
) {
  const { notify } = useNotifications()
  const wasPendingRef = useRef(false)
  const description = options?.description
  const variant = options?.variant
  const durationMs = options?.durationMs

  useEffect(() => {
    if (!title) return

    if (pending) {
      wasPendingRef.current = true
      return
    }

    if (!wasPendingRef.current || !isOk) return

    wasPendingRef.current = false
    notify({
      title,
      description,
      variant: variant ?? 'success',
      durationMs,
    })
  }, [isOk, pending, title, description, variant, durationMs, notify])
}
