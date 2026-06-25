'use client'

import clsx from 'clsx'
import Image from 'next/image'
import { useState } from 'react'
import {
  canOptimizeWithNextImage,
  resolveImageSrc,
} from '@/lib/utils/image-src'

type ObjectFit = 'cover' | 'contain' | 'fill' | 'none'

const objectFitClass: Record<ObjectFit, string> = {
  cover: 'object-cover',
  contain: 'object-contain',
  fill: 'object-fill',
  none: 'object-none',
}

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  sizes?: string
  className?: string
  containerClassName?: string
  priority?: boolean
  objectFit?: ObjectFit
  referrerPolicy?: React.HTMLAttributeReferrerPolicy
  onError?: () => void
  fallback?: React.ReactNode
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  sizes,
  className,
  containerClassName,
  priority = false,
  objectFit = 'cover',
  referrerPolicy = 'no-referrer',
  onError,
  fallback = null,
}: OptimizedImageProps) {
  const [failed, setFailed] = useState(false)
  const resolvedSrc = resolveImageSrc(src)
  const fitClass = objectFitClass[objectFit]

  const handleError = () => {
    setFailed(true)
    onError?.()
  }

  if (!resolvedSrc || failed) {
    return fallback ? <>{fallback}</> : null
  }

  const sharedClass = clsx(fitClass, className)

  if (!canOptimizeWithNextImage(resolvedSrc)) {
    if (fill) {
      return (
        <span className={clsx('relative block size-full', containerClassName)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvedSrc}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            referrerPolicy={referrerPolicy}
            className={clsx('absolute inset-0 size-full', sharedClass)}
            onError={handleError}
          />
        </span>
      )
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy={referrerPolicy}
        className={sharedClass}
        onError={handleError}
      />
    )
  }

  if (fill) {
    return (
      <span className={clsx('relative block size-full', containerClassName)}>
        <Image
          src={resolvedSrc}
          alt={alt}
          fill
          sizes={sizes ?? '100vw'}
          priority={priority}
          className={sharedClass}
          onError={handleError}
        />
      </span>
    )
  }

  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      width={width ?? 48}
      height={height ?? 48}
      sizes={sizes}
      priority={priority}
      className={sharedClass}
      onError={handleError}
    />
  )
}
