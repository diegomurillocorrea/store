'use client'

import { ArrowUpTrayIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import {
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import { MAX_BRAND_LOGO_BYTES } from '@/lib/utils/brand-logo'
import { optimizeBrandLogoFile } from '@/lib/utils/optimize-brand-logo-client'
import {
  deleteBrandLogoClient,
  uploadBrandLogoClient,
} from '@/lib/utils/upload-brand-logo-client'
import { Field, Label } from '@/styles/catalyst-ui-kit/fieldset'
import { Text } from '@/styles/catalyst-ui-kit/text'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ACCEPT_LABEL = 'PNG, JPG o WebP'

interface BrandLogoFieldProps {
  inputId: string
  organizationId: string
  currentLogoUrl?: string | null
  disabled?: boolean
  onUploadingChange?: (isUploading: boolean) => void
}

function isAcceptedLogo(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type)
}

export function BrandLogoField({
  inputId,
  organizationId,
  currentLogoUrl,
  disabled = false,
  onUploadingChange,
}: BrandLogoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl ?? null)
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'optimizing' | 'uploading'>('idle')
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  useEffect(() => {
    setPreviewUrl(currentLogoUrl ?? null)
    setUploadedLogoUrl(null)
    setRemoveLogo(false)
    setLocalPreview(null)
    setFileError(null)
    setUploadPhase('idle')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [currentLogoUrl])

  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview)
      }
    }
  }, [localPreview])

  useEffect(() => {
    onUploadingChange?.(uploadPhase !== 'idle')
  }, [onUploadingChange, uploadPhase])

  const applyFile = async (file: File | undefined) => {
    if (!file || disabled) return

    if (!isAcceptedLogo(file)) {
      setFileError(`Formato no válido. Usa ${ACCEPT_LABEL}.`)
      return
    }

    if (file.size > MAX_BRAND_LOGO_BYTES) {
      setFileError('El logo no puede superar 2 MB.')
      return
    }

    if (localPreview) {
      URL.revokeObjectURL(localPreview)
    }

    const objectUrl = URL.createObjectURL(file)
    setLocalPreview(objectUrl)
    setPreviewUrl(objectUrl)
    setRemoveLogo(false)
    setFileError(null)
    setUploadPhase('optimizing')

    const previousUploadedLogoUrl = uploadedLogoUrl
    const optimizedFile = await optimizeBrandLogoFile(file)
    setUploadPhase('uploading')
    const result = await uploadBrandLogoClient(organizationId, optimizedFile)
    setUploadPhase('idle')

    if (result.error || !result.url) {
      setFileError(result.error ?? 'No se pudo subir el logo.')
      setPreviewUrl(currentLogoUrl ?? null)
      setUploadedLogoUrl(null)
      URL.revokeObjectURL(objectUrl)
      setLocalPreview(null)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
      return
    }

    if (previousUploadedLogoUrl && previousUploadedLogoUrl !== currentLogoUrl) {
      void deleteBrandLogoClient(previousUploadedLogoUrl, organizationId)
    }

    setUploadedLogoUrl(result.url)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    void applyFile(file)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (disabled) return
    void applyFile(event.dataTransfer.files?.[0])
  }

  const handleRemove = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (disabled) return

    if (localPreview) {
      URL.revokeObjectURL(localPreview)
      setLocalPreview(null)
    }

    if (inputRef.current) {
      inputRef.current.value = ''
    }

    if (uploadedLogoUrl && uploadedLogoUrl !== currentLogoUrl) {
      void deleteBrandLogoClient(uploadedLogoUrl, organizationId)
    }

    setUploadedLogoUrl(null)
    setPreviewUrl(null)
    setRemoveLogo(true)
    setFileError(null)
  }

  const openFilePicker = () => {
    if (!disabled && uploadPhase === 'idle') {
      inputRef.current?.click()
    }
  }

  const hasPreview = Boolean(previewUrl)
  const isUploading = uploadPhase !== 'idle'
  const uploadStatusLabel =
    uploadPhase === 'optimizing' ? 'Optimizando logo…' : 'Subiendo logo…'
  const submittedLogoUrl = removeLogo ? '' : (uploadedLogoUrl ?? currentLogoUrl ?? '')

  return (
    <Field>
      <Label htmlFor={inputId}>Logo</Label>
      <input type="hidden" name="removeLogo" value={removeLogo ? 'true' : 'false'} />
      <input type="hidden" name="logoUrl" value={submittedLogoUrl} />

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={hasPreview ? undefined : openFilePicker}
        onKeyDown={(event) => {
          if (!hasPreview && !isUploading && !disabled && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            openFilePicker()
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={clsx(
          'group relative mt-2 overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500',
          hasPreview
            ? 'border-border bg-zinc-50/60 dark:bg-zinc-900/30'
            : 'cursor-pointer bg-zinc-50/90 hover:border-emerald-400/45 hover:bg-emerald-50/40 dark:bg-zinc-900/45 dark:hover:border-emerald-500/35 dark:hover:bg-emerald-950/25',
          isDragging &&
            'scale-[1.01] border-emerald-500 bg-emerald-50/70 shadow-[0_0_0_4px_rgba(16,185,129,0.12)] dark:bg-emerald-950/35 dark:shadow-[0_0_0_4px_rgba(16,185,129,0.18)]',
          !hasPreview && !isDragging && 'border-zinc-300/80 dark:border-zinc-600/70',
          (isUploading || disabled) && 'pointer-events-none opacity-70'
        )}
      >
        {hasPreview ? (
          <div className="flex min-h-40 flex-col items-center justify-center p-6">
            <div className="relative overflow-hidden rounded-lg border border-border bg-white/70 p-4 shadow-sm dark:bg-zinc-950/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl!}
                alt="Vista previa del logo"
                width={400}
                height={128}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="mx-auto max-h-32 max-w-full object-contain"
              />
              {!disabled ? (
                <button
                  type="button"
                  onClick={handleRemove}
                  aria-label="Quitar logo"
                  disabled={isUploading}
                  className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full border border-border bg-white/95 text-zinc-600 shadow-sm transition hover:bg-red-50 hover:text-red-600 dark:bg-zinc-900/95 dark:text-zinc-300 dark:hover:bg-red-950/60 dark:hover:text-red-400"
                >
                  <XMarkIcon className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>

            {!disabled ? (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    openFilePicker()
                  }}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white/80 px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:border-emerald-400/50 hover:bg-emerald-50/60 disabled:opacity-60 dark:bg-zinc-900/70 dark:hover:bg-emerald-950/40"
                >
                  <ArrowUpTrayIcon className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  {isUploading ? uploadStatusLabel : 'Cambiar logo'}
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isUploading}
                  className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  Quitar
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex min-h-40 flex-col items-center justify-center px-6 py-8 text-center">
            <div
              className={clsx(
                'flex size-14 items-center justify-center rounded-2xl ring-1 transition duration-200',
                isDragging
                  ? 'bg-emerald-500/15 ring-emerald-500/30'
                  : 'bg-emerald-500/10 ring-emerald-500/20 group-hover:bg-emerald-500/15 group-hover:ring-emerald-500/35'
              )}
            >
              <PhotoIcon
                aria-hidden="true"
                className={clsx(
                  'size-7 transition-colors',
                  isDragging
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-emerald-600/80 group-hover:text-emerald-600 dark:text-emerald-400/90 dark:group-hover:text-emerald-400'
                )}
              />
            </div>

            <p className="mt-3 text-sm font-medium text-foreground">
              {isUploading ? uploadStatusLabel : isDragging ? 'Suelta aquí' : 'Arrastra o selecciona tu logo'}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Explorar</span>
              <span className="mx-1.5 text-zinc-400">·</span>
              hasta 2 MB
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
              {['PNG', 'JPG', 'WebP'].map((format) => (
                <span
                  key={format}
                  className="rounded-md border border-border bg-white/70 px-2 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase dark:bg-zinc-900/60"
                >
                  {format}
                </span>
              ))}
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="sr-only"
          disabled={disabled}
          onChange={handleFileChange}
        />
      </div>

      <Text className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Sube una imagen cuadrada o horizontal con fondo transparente (PNG) si lo necesitas.
      </Text>

      {fileError ? (
        <Text
          className="mt-2 rounded-lg border border-red-500/30 bg-red-50 px-3 py-2 text-sm text-red-800! dark:bg-red-950/40 dark:text-red-200!"
          role="alert"
        >
          {fileError}
        </Text>
      ) : null}
    </Field>
  )
}
