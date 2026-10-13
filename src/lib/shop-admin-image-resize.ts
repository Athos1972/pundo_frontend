// Shop-Admin Clean Boundary: browser APIs only, no customer-facing imports.
// Client-side downscaling of large phone photos before upload (B5900-009, T5).

export interface ResizeOptions {
  /** Longest edge in px after resizing */
  maxEdge: number
  /** Target upper bound for the encoded file */
  maxBytes: number
  /** JPEG/WebP quality 0..1 */
  quality: number
}

export const DEFAULT_RESIZE_OPTIONS: ResizeOptions = {
  maxEdge: 2560,
  maxBytes: 5 * 1024 * 1024,
  quality: 0.85,
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), type, quality)
    } catch {
      resolve(null)
    }
  })
}

function renameExt(name: string, ext: string): string {
  const base = name.replace(/\.[^./\\]+$/, '')
  return `${base || 'photo'}.${ext}`
}

/**
 * Returns the file unchanged when it is small enough (or cannot be decoded but is within
 * the byte limit). Downscales / re-encodes oversized images. Returns `null` when the file
 * is too large and could not be shrunk (decoding or canvas failure).
 */
export async function resizeImageForUpload(
  file: File,
  opts: ResizeOptions = DEFAULT_RESIZE_OPTIONS,
): Promise<File | null> {
  const fallback = () => (file.size <= opts.maxBytes ? file : null)

  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return fallback()

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return fallback()
  }

  try {
    const longest = Math.max(bitmap.width, bitmap.height)
    if (file.size <= opts.maxBytes && longest <= opts.maxEdge) return file

    let scale = longest > opts.maxEdge ? opts.maxEdge / longest : 1
    // Up to 3 attempts: shrink further if the encoded result is still too big.
    for (let attempt = 0; attempt < 3; attempt++) {
      const w = Math.max(1, Math.round(bitmap.width * scale))
      const h = Math.max(1, Math.round(bitmap.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return fallback()
      ctx.drawImage(bitmap, 0, 0, w, h)

      // PNG/WebP may carry transparency -> keep it via WebP; everything else becomes JPEG.
      const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp'
      const blob = await canvasToBlob(canvas, type, opts.quality)
      if (!blob || blob.type !== type) return fallback()
      if (blob.size <= opts.maxBytes) {
        return new File([blob], renameExt(file.name, type === 'image/jpeg' ? 'jpg' : 'webp'), { type })
      }
      scale *= 0.75
    }
    return null
  } finally {
    bitmap.close?.()
  }
}
