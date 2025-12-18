/**
 * LINE LIFF Service
 * - Safe to call in normal browsers (no-op if VITE_LIFF_ID not set)
 */

import liff from '@line/liff'

const LIFF_ID = import.meta.env.VITE_LIFF_ID || ''

let liffInstance = null
let isInitialized = false
let initPromise = null

export async function initLiff() {
  if (isInitialized && liffInstance) return liffInstance
  if (initPromise) return initPromise

  // Allow running without LIFF in normal browser/dev
  if (!LIFF_ID) {
    console.log('ℹ️ VITE_LIFF_ID not set, skipping LIFF init (normal browser mode)')
    return null
  }

  initPromise = liff
    .init({ liffId: LIFF_ID })
    .then(() => {
      liffInstance = liff
      isInitialized = true
      console.log('✅ LIFF initialized')
      return liffInstance
    })
    .catch((err) => {
      console.warn('⚠️ LIFF init failed (still ok in normal browser):', err)
      liffInstance = null
      isInitialized = false
      return null
    })

  return initPromise
}

export function isLiffReady() {
  return isInitialized && !!liffInstance
}

export function isInLine() {
  try {
    return isLiffReady() && liffInstance.isInClient()
  } catch {
    return false
  }
}

export async function getLineUserId() {
  const inst = await initLiff()
  if (!inst) return null

  try {
    if (!inst.isInClient()) return null
    const profile = await inst.getProfile()
    return profile?.userId || null
  } catch (e) {
    console.warn('getLineUserId failed:', e)
    return null
  }
}

export async function openLiffWindow(url, external = true) {
  if (!url) return false

  const inst = await initLiff()
  if (inst && typeof inst.openWindow === 'function') {
    try {
      inst.openWindow({ url, external })
      return true
    } catch (e) {
      console.warn('liff.openWindow failed:', e)
    }
  }

  window.open(url, '_blank', 'noopener,noreferrer')
  return false
}


