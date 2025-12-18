import mock1 from '../assets/mockup_wallpaper_01.png'
import mock2 from '../assets/mockup_wallpaper_02.png'

const MOCKS = [mock1, mock2]

/**
 * Mock: generate + upload image.
 * Returns an image asset for UI preview (NO real upload; no cloud url to avoid accidental link opens).
 */
export async function mockGenerateAndUploadAiWallpaper({ prompt, delayMs = 2200 }) {
  // simulate network + generation time
  await new Promise((r) => setTimeout(r, delayMs))

  const imageSrc = MOCKS[Math.floor(Math.random() * MOCKS.length)]

  return {
    imageSrc,
    cloudUrl: null,
    prompt,
  }
}


