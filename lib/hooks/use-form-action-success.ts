'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

/** Cierra el diálogo y refresca la ruta tras cada server action exitoso. */
export function useFormActionSuccess(
  isOk: boolean,
  onClose: () => void,
  pending: boolean
) {
  const router = useRouter()
  const onCloseRef = useRef(onClose)
  const wasPendingRef = useRef(false)

  onCloseRef.current = onClose

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
