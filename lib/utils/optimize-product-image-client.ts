'use client'

const MAX_DIMENSION = 1200
const TARGET_QUALITY = 0.85
const SKIP_OPTIMIZE_BELOW_BYTES = 280_000

let supportsWebpOutput: boolean | null = null

function canEncodeWebp(): boolean {
  if (supportsWebpOutput != null) return supportsWebpOutput

  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  supportsWebpOutput = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  return supportsWebpOutput
}

function buildOptimizedFileName(fileName: string, extension: string): string {
  const baseName = fileName.replace(/\.[^.]+$/, '').trim() || 'producto'
  return `${baseName}.${extension}`
}

export async function optimizeProductImageFile(file: File): Promise<File> {
  if (file.type === 'image/gif') return file

  if (
    file.size <= SKIP_OPTIMIZE_BELOW_BYTES &&
    (file.type === 'image/webp' || file.type === 'image/jpeg')
  ) {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
    const largestSide = Math.max(bitmap.width, bitmap.height)
    const scale = largestSide > MAX_DIMENSION ? MAX_DIMENSION / largestSide : 1
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return file
    }

    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const outputType = canEncodeWebp() ? 'image/webp' : 'image/jpeg'
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), outputType, TARGET_QUALITY)
    })

    if (!blob || blob.size >= file.size) {
      return file
    }

    const extension = outputType === 'image/webp' ? 'webp' : 'jpg'
    return new File([blob], buildOptimizedFileName(file.name, extension), {
      type: outputType,
      lastModified: Date.now(),
    })
  } catch {
    return file
  }
}
