'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useActionStateNotification } from '@/lib/hooks/use-action-state-notification'

/** Cierra el diálogo, refresca la ruta y opcionalmente muestra una notificación tras un server action exitoso. */
export function useFormActionSuccess(
  isOk: boolean,
  onClose: () => void,
  pending: boolean,
  successMessage?: string
) {
  const router = useRouter()
  const onCloseRef = useRef(onClose)
  const wasPendingRef = useRef(false)

  onCloseRef.current = onClose

  useActionStateNotification(isOk, pending, successMessage ?? '')

  useEffect(() => {
    if (pending) {
      wasPendingRef.current = true
      return
    }

    if (!wasPendingRef.current || !isOk) return

    wasPendingRef.current = false
    onCloseRef.current()
    router.refresh()
  }, [isOk, pending, router])
}
