'use client'

import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { getPosImageCandidates } from '@/lib/utils/image-src'

interface PosProductImageProps {
  src: string
  alt: string
  width: number
  height?: number
  className?: string
  fill?: boolean
  priority?: boolean
}

export function PosProductImage({
  src,
  alt,
  width,
  height,
  className,
  fill = false,
  priority = false,
}: PosProductImageProps) {
  const candidates = useMemo(
    () => getPosImageCandidates(src, {
      width,
      height: height ?? width,
      quality: 70,
      resize: 'cover',
    }),
    [src, width, height]
  )
  const [candidateIndex, setCandidateIndex] = useState(0)
  const currentSrc = candidates[candidateIndex] ?? ''

  if (!currentSrc) return null

  const sharedClass = clsx(
    fill ? 'absolute inset-0 size-full object-cover' : 'object-cover',
    className
  )

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : (height ?? width)}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      referrerPolicy="no-referrer"
      className={sharedClass}
      onError={() => {
        setCandidateIndex((current) => {
          if (current + 1 >= candidates.length) return current
          return current + 1
        })
      }}
    />
  )
}
