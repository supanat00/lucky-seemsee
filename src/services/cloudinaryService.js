/**
 * Cloudinary Service (browser / unsigned upload)
 * Used ONLY for LIFF flow to get an externally accessible URL.
 *
 * Notes:
 * - Do NOT put API secret in browser.
 * - For overwriting the same asset, use a stable `public_id` and configure the upload preset to allow overwrite.
 */

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || ''
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || ''
const defaultFolder = import.meta.env.VITE_CLOUDINARY_FOLDER || 'lucky-seemsee'

export async function uploadImageToCloudinary({ dataUrl, folder = defaultFolder, publicId }) {
  if (!cloudName) {
    return { success: false, error: 'Cloudinary is not configured (missing VITE_CLOUDINARY_CLOUD_NAME)' }
  }
  if (!uploadPreset) {
    return { success: false, error: 'Cloudinary is not configured (missing VITE_CLOUDINARY_UPLOAD_PRESET)' }
  }
  if (!dataUrl) {
    return { success: false, error: 'No image data to upload' }
  }

  try {
    const formData = new FormData()
    formData.append('file', dataUrl)
    formData.append('upload_preset', uploadPreset)
    if (folder) formData.append('folder', folder)
    if (publicId) formData.append('public_id', publicId)

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
    const res = await fetch(uploadUrl, { method: 'POST', body: formData })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(json?.error?.message || `Upload failed: ${res.status}`)
    }

    return { success: true, url: json.secure_url, publicId: json.public_id }
  } catch (e) {
    return { success: false, error: e?.message || 'Failed to upload image' }
  }
}

export async function uploadImageUrlToCloudinary({ imageUrl, folder = defaultFolder, publicId }) {
  if (!imageUrl) {
    return { success: false, error: 'No image URL to upload' }
  }

  try {
    const res = await fetch(imageUrl)
    const blob = await res.blob()
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

    return await uploadImageToCloudinary({ dataUrl, folder, publicId })
  } catch (e) {
    return { success: false, error: e?.message || 'Failed to convert image for upload' }
  }
}


