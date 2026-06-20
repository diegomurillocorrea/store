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
import {
  deleteProductImageClient,
  uploadProductImageClient,
} from '@/lib/utils/upload-product-image-client'
import { Field, Label } from '@/styles/catalyst-ui-kit/fieldset'
import { Text } from '@/styles/catalyst-ui-kit/text'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ACCEPT_LABEL = 'PNG, JPG, WebP o GIF'

interface ProductImageFieldProps {
  inputId: string
  organizationId: string
  currentImageUrl?: string | null
  compact?: boolean
  resetKey?: boolean | string | number
}

function isAcceptedImage(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type)
}

export function ProductImageField({
  inputId,
  organizationId,
  currentImageUrl,
  compact = false,
  resetKey,
}: ProductImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl ?? null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  useEffect(() => {
    setPreviewUrl(currentImageUrl ?? null)
    setUploadedImageUrl(null)
    setRemoveImage(false)
    setLocalPreview(null)
    setFileError(null)
    setIsUploading(false)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [currentImageUrl, resetKey])

  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview)
      }
    }
  }, [localPreview])

  const applyFile = async (file: File | undefined) => {
    if (!file) return

    if (!isAcceptedImage(file)) {
      setFileError(`Formato no válido. Usa ${ACCEPT_LABEL}.`)
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError('La imagen no puede superar 5 MB.')
      return
    }

    if (localPreview) {
      URL.revokeObjectURL(localPreview)
    }

    const objectUrl = URL.createObjectURL(file)
    setLocalPreview(objectUrl)
    setPreviewUrl(objectUrl)
    setRemoveImage(false)
    setFileError(null)
    setIsUploading(true)

    const result = await uploadProductImageClient(organizationId, file)
    setIsUploading(false)

    if (result.error || !result.url) {
      setFileError(result.error ?? 'No se pudo subir la imagen.')
      setPreviewUrl(currentImageUrl ?? null)
      setUploadedImageUrl(null)
      URL.revokeObjectURL(objectUrl)
      setLocalPreview(null)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
      return
    }

    if (uploadedImageUrl && uploadedImageUrl !== currentImageUrl) {
      await deleteProductImageClient(uploadedImageUrl)
    }

    setUploadedImageUrl(result.url)
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
    setIsDragging(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    void applyFile(event.dataTransfer.files?.[0])
  }

  const handleRemove = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (localPreview) {
      URL.revokeObjectURL(localPreview)
      setLocalPreview(null)
    }

    if (inputRef.current) {
      inputRef.current.value = ''
    }

    if (uploadedImageUrl && uploadedImageUrl !== currentImageUrl) {
      void deleteProductImageClient(uploadedImageUrl)
    }

    setUploadedImageUrl(null)
    setPreviewUrl(null)
    setRemoveImage(true)
    setFileError(null)
  }

  const openFilePicker = () => {
    if (!isUploading) {
      inputRef.current?.click()
    }
  }

  const hasPreview = Boolean(previewUrl)
  const submittedImageUrl = removeImage ? '' : (uploadedImageUrl ?? currentImageUrl ?? '')

  return (
    <Field>
      <Label htmlFor={inputId}>Imagen</Label>
      <input type="hidden" name="removeImage" value={removeImage ? 'true' : 'false'} />
      <input type="hidden" name="imageUrl" value={submittedImageUrl} />

      <div
        role="button"
        tabIndex={0}
        onClick={hasPreview ? undefined : openFilePicker}
        onKeyDown={(event) => {
          if (!hasPreview && !isUploading && (event.key === 'Enter' || event.key === ' ')) {
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
          isUploading && 'pointer-events-none opacity-70'
        )}
      >
        {hasPreview ? (
          <div className={clsx('relative flex flex-col items-center justify-center p-4', compact ? 'min-h-40' : 'min-h-52 p-6')}>
            <div className="relative overflow-hidden rounded-lg border border-border bg-white/70 shadow-sm dark:bg-zinc-950/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl!}
                alt="Vista previa del producto"
                className={clsx('max-w-full object-contain', compact ? 'max-h-36' : 'max-h-56')}
              />
              <button
                type="button"
                onClick={handleRemove}
                aria-label="Quitar imagen"
                disabled={isUploading}
                className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full border border-border bg-white/95 text-zinc-600 shadow-sm transition hover:bg-red-50 hover:text-red-600 dark:bg-zinc-900/95 dark:text-zinc-300 dark:hover:bg-red-950/60 dark:hover:text-red-400"
              >
                <XMarkIcon className="size-4" aria-hidden="true" />
              </button>
            </div>

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
                {isUploading ? 'Subiendo…' : 'Cambiar imagen'}
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
          </div>
        ) : (
          <div
            className={clsx(
              'flex flex-col items-center justify-center px-4 py-6 text-center',
              compact ? 'min-h-40' : 'min-h-44 px-6 py-8 sm:min-h-48'
            )}
          >
            <div
              className={clsx(
                'flex items-center justify-center rounded-2xl ring-1 transition duration-200',
                compact ? 'size-12' : 'size-16',
                isDragging
                  ? 'bg-emerald-500/15 ring-emerald-500/30'
                  : 'bg-emerald-500/10 ring-emerald-500/20 group-hover:bg-emerald-500/15 group-hover:ring-emerald-500/35'
              )}
            >
              <PhotoIcon
                aria-hidden="true"
                className={clsx(
                  'transition-colors',
                  compact ? 'size-6' : 'size-8',
                  isDragging
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-emerald-600/80 group-hover:text-emerald-600 dark:text-emerald-400/90 dark:group-hover:text-emerald-400'
                )}
              />
            </div>

            <p className={clsx('mt-3 font-medium text-foreground', compact ? 'text-xs' : 'text-sm')}>
              {isUploading ? 'Subiendo imagen…' : isDragging ? 'Suelta aquí' : 'Arrastra o selecciona'}
            </p>

            {!compact ? (
              <>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Explorar</span>
                  <span className="mx-1.5 text-zinc-400">·</span>
                  hasta 5 MB
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                  {['PNG', 'JPG', 'WebP', 'GIF'].map((format) => (
                    <span
                      key={format}
                      className="rounded-md border border-border bg-white/70 px-2 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase dark:bg-zinc-900/60"
                    >
                      {format}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-1 text-[11px] text-muted-foreground">Hasta 5 MB</p>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>

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
