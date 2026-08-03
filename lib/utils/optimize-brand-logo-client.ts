'use client'

const MAX_DIMENSION = 800
const TARGET_QUALITY = 0.88
const SKIP_OPTIMIZE_BELOW_BYTES = 180_000

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
  const baseName = fileName.replace(/\.[^.]+$/, '').trim() || 'logo'
  return `${baseName}.${extension}`
}

export async function optimizeBrandLogoFile(file: File): Promise<File> {
  if (file.size <= SKIP_OPTIMIZE_BELOW_BYTES) return file

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

    const preservePng = file.type === 'image/png'
    const outputType = preservePng
      ? 'image/png'
      : canEncodeWebp()
        ? 'image/webp'
        : 'image/jpeg'

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (result) => resolve(result),
        outputType,
        preservePng ? undefined : TARGET_QUALITY
      )
    })

    if (!blob || blob.size >= file.size) {
      return file
    }

    const extension = preservePng
      ? 'png'
      : outputType === 'image/webp'
        ? 'webp'
        : 'jpg'

    return new File([blob], buildOptimizedFileName(file.name, extension), {
      type: outputType,
      lastModified: Date.now(),
    })
  } catch {
    return file
  }
}
