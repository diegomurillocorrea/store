'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

/** Cierra el diálogo y refresca la ruta una sola vez tras un server action exitoso. */
export function useFormActionSuccess(isOk: boolean, onClose: () => void) {
  const router = useRouter()
  const onCloseRef = useRef(onClose)
  const handledRef = useRef(false)

  onCloseRef.current = onClose

  useEffect(() => {
    if (!isOk) {
      handledRef.current = false
      return
    }
    if (handledRef.current) return
    handledRef.current = true
    onCloseRef.current()
    router.refresh()
  }, [isOk, router])
}
