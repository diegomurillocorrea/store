'use client'

import { useState } from 'react'
import { getProxiedLogoSrc } from '@/lib/theme/branding'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface OrgBrandLogoProps {
  logoUrl: string
  orgName: string
}

export function OrgBrandLogo({ logoUrl, orgName }: OrgBrandLogoProps) {
  const [failed, setFailed] = useState(false)
  const src = getProxiedLogoSrc(logoUrl)

  if (failed) {
    return (
      <Text className="text-xs text-amber-700 dark:text-amber-300" role="alert">
        No se pudo mostrar el logo (Meta/Instagram suelen bloquear enlaces externos). Sube la imagen a un
        alojamiento público estable o a Supabase Storage y pega esa URL.
      </Text>
    )
  }

  return (
    <img
      src={src}
      alt={orgName}
      className="h-10 w-auto max-w-[200px] object-contain object-left"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}
