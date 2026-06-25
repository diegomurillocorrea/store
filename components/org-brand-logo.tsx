'use client'

import { useState } from 'react'
import { OptimizedImage } from '@/components/optimized-image'
import { IMAGE_SIZES } from '@/lib/utils/image-src'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface OrgBrandLogoProps {
  logoUrl: string
  orgName: string
}

export function OrgBrandLogo({ logoUrl, orgName }: OrgBrandLogoProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <Text className="text-xs text-amber-700 dark:text-amber-300" role="alert">
        No se pudo cargar el logo. Revisa la URL en Marca y colores o usa un enlace público estable.
      </Text>
    )
  }

  return (
    <div className="relative h-10 w-[200px]">
      <OptimizedImage
        src={logoUrl}
        alt={orgName}
        fill
        sizes={IMAGE_SIZES.logo}
        objectFit="contain"
        className="object-left"
        onError={() => setFailed(true)}
      />
    </div>
  )
}
