// Lightweight image preloader with caching + optional decode.
// Designed for image-sequence playback on mobile (avoid stutter from on-demand decode).

const imagePromiseCache = new Map()

function nextTick() {
  return new Promise((r) => setTimeout(r, 0))
}

/**
 * Load (and optionally decode) an image. Results are cached by `src` to avoid duplicate loads.
 * @param {string} src
 * @param {{ decode?: boolean, signal?: AbortSignal }} opts
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(src, opts = {}) {
  const { decode = true, signal } = opts
  if (!src) return Promise.reject(new Error('loadImage: missing src'))

  const cached = imagePromiseCache.get(src)
  if (cached) return cached

  if (signal?.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'))
  }

  const promise = new Promise((resolve, reject) => {
    const img = new Image()

    const abortHandler = () => {
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }

    const cleanup = () => {
      if (signal) signal.removeEventListener('abort', abortHandler)
      img.onload = null
      img.onerror = null
    }

    if (signal) signal.addEventListener('abort', abortHandler, { once: true })

    img.onload = async () => {
      try {
        // decode() avoids first-frame jank when swapping src rapidly
        if (decode && img.decode) {
          try {
            await img.decode()
          } catch {
            // ignore decode failures (some browsers reject decode on cached images)
          }
        }
        cleanup()
        resolve(img)
      } catch (e) {
        cleanup()
        reject(e)
      }
    }

    img.onerror = () => {
      cleanup()
      reject(new Error(`Failed to load image: ${src}`))
    }

    // Hint: async decoding where supported
    try {
      img.decoding = 'async'
    } catch {
      // ignore
    }

    img.src = src
  })

  imagePromiseCache.set(src, promise)
  return promise
}

/**
 * Preload a list of image URLs with a concurrency limit.
 * @param {string[]} sources
 * @param {{
 *   concurrency?: number,
 *   decode?: boolean,
 *   signal?: AbortSignal,
 *   onProgress?: (info: { loaded: number, total: number, src: string }) => void,
 * }} opts
 * @returns {Promise<{ images: HTMLImageElement[], failed: { src: string, error: unknown }[] }>}
 */
export async function preloadImages(sources, opts = {}) {
  const { concurrency = 4, decode = true, signal, onProgress } = opts

  const unique = Array.from(new Set((sources || []).filter(Boolean)))
  const total = unique.length
  if (total === 0) return { images: [], failed: [] }

  let cursor = 0
  let loaded = 0
  const images = new Array(total)
  const failed = []

  const worker = async () => {
    while (cursor < total) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

      const idx = cursor
      cursor += 1
      const src = unique[idx]

      try {
        images[idx] = await loadImage(src, { decode, signal })
      } catch (e) {
        failed.push({ src, error: e })
      } finally {
        loaded += 1
        onProgress?.({ loaded, total, src })
        // yield to keep UI responsive on low-end devices
        await nextTick()
      }
    }
  }

  const poolSize = Math.max(1, Math.min(concurrency, total))
  await Promise.all(Array.from({ length: poolSize }, () => worker()))

  return { images: images.filter(Boolean), failed }
}

/**
 * Optional helper for debugging/testing.
 */
export function clearPreloadedImagesCache() {
  imagePromiseCache.clear()
}


