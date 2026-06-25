'use client'

import { useState } from 'react'
import { OptimizedImage } from '@/components/optimized-image'
import { IMAGE_SIZES } from '@/lib/utils/image-src'
import { Field, Label } from '@/styles/catalyst-ui-kit/fieldset'
import { Input } from '@/styles/catalyst-ui-kit/input'
import { Text } from '@/styles/catalyst-ui-kit/text'

interface BrandUrlFieldProps {
  inputId: string
  name: string
  label: string
  hint: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  previewAlt: string
}

export function BrandUrlField({
  inputId,
  name,
  label,
  hint,
  placeholder = 'https://…',
  value,
  onChange,
  previewAlt,
}: BrandUrlFieldProps) {
  const [previewFailed, setPreviewFailed] = useState(false)
  const trimmed = value.trim()
  const hasPreview = trimmed.length > 0

  return (
    <Field>
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        type="url"
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          setPreviewFailed(false)
          onChange(event.target.value)
        }}
      />
      <Text className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{hint}</Text>

      {hasPreview && !previewFailed ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
          <OptimizedImage
            src={trimmed}
            alt={previewAlt}
            width={400}
            height={128}
            sizes={IMAGE_SIZES.preview}
            objectFit="contain"
            className="mx-auto max-h-32 max-w-full"
            onError={() => setPreviewFailed(true)}
          />
        </div>
      ) : null}

      {hasPreview && previewFailed ? (
        <Text className="mt-2 text-xs text-amber-700 dark:text-amber-300" role="status">
          No se pudo previsualizar esta URL. Puedes guardarla igual; si no se ve después, prueba otro enlace
          público (Pinterest, Imgur, tu CDN, etc.).
        </Text>
      ) : null}
    </Field>
  )
}
