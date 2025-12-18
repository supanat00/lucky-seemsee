/**
 * Cloudinary Service (browser / unsigned upload)
 * Used ONLY for LIFF flow to get an externally accessible URL.
 *
 * Notes:
 * - Do NOT put API secret in browser.
 * - For overwriting the same asset, use a stable `public_id` and configure the upload preset to allow overwrite.
 */

const cloudinaryUrlEnv = import.meta.env.VITE_CLOUDINARY_URL || "";
const cloudNameEnv = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
// default to ml_default to align with random-wallpaper (unsigned preset)
const uploadPreset =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "ml_default";
const defaultFolder = import.meta.env.VITE_CLOUDINARY_FOLDER || "lucky-seemsee";

function resolveCloudinaryUploadUrl() {
  const raw = (cloudinaryUrlEnv || "").trim();
  if (raw) {
    // If user provides full REST upload endpoint, use it as-is.
    if (/^https?:\/\//i.test(raw)) {
      // Accept both:
      // - https://api.cloudinary.com/v1_1/<cloud>/image/upload
      // - https://api.cloudinary.com/v1_1/<cloud>   (append /image/upload)
      if (/\/image\/upload\/?$/i.test(raw)) return raw;
      if (/\/v1_1\/[^/]+\/?$/i.test(raw))
        return `${raw.replace(/\/+$/, "")}/image/upload`;
      return raw;
    }

    // If user accidentally provides server-side CLOUDINARY_URL format: cloudinary://key:secret@cloud
    // We only extract cloud name (still using unsigned upload preset).
    if (/^cloudinary:\/\//i.test(raw)) {
      const match = raw.match(/@([^/]+)$/);
      const cloud = match?.[1] || "";
      if (cloud) return `https://api.cloudinary.com/v1_1/${cloud}/image/upload`;
    }
  }

  if (cloudNameEnv) {
    return `https://api.cloudinary.com/v1_1/${cloudNameEnv}/image/upload`;
  }

  return "";
}

export async function uploadImageToCloudinary({
  dataUrl,
  folder = defaultFolder,
  publicId,
}) {
  const uploadUrl = resolveCloudinaryUploadUrl();
  if (!uploadUrl) {
    return {
      success: false,
      error:
        "Cloudinary is not configured (missing VITE_CLOUDINARY_URL or VITE_CLOUDINARY_CLOUD_NAME)",
    };
  }
  if (!uploadPreset) {
    return {
      success: false,
      error:
        "Cloudinary is not configured (missing VITE_CLOUDINARY_UPLOAD_PRESET)",
    };
  }
  if (!dataUrl) {
    return { success: false, error: "No image data to upload" };
  }

  try {
    const formData = new FormData();
    formData.append("file", dataUrl);
    formData.append("upload_preset", uploadPreset);
    if (folder) formData.append("folder", folder);
    if (publicId) formData.append("public_id", publicId);
    // Prefer overwrite to avoid consuming storage with many assets.
    // Some unsigned presets may reject these fields; we retry without them if needed.
    formData.append("overwrite", "true");
    formData.append("unique_filename", "false");
    formData.append("invalidate", "true");

    const tryUpload = async (fd) => {
      const res = await fetch(uploadUrl, { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      return { res, json };
    };

    let { res, json } = await tryUpload(formData);

    if (!res.ok) {
      const msg = json?.error?.message || `Upload failed: ${res.status}`;
      // Retry without overwrite fields (rely on preset settings) if Cloudinary rejects parameters.
      const looksLikeParamError =
        /unknown\s+parameter|invalid\s+parameter|not\s+allowed|unexpected/i.test(
          msg
        );

      if (looksLikeParamError) {
        const fd2 = new FormData();
        fd2.append("file", dataUrl);
        fd2.append("upload_preset", uploadPreset);
        if (folder) fd2.append("folder", folder);
        if (publicId) fd2.append("public_id", publicId);
        ({ res, json } = await tryUpload(fd2));
      }
    }

    if (!res.ok) {
      throw new Error(json?.error?.message || `Upload failed: ${res.status}`);
    }

    return { success: true, url: json.secure_url, publicId: json.public_id };
  } catch (e) {
    return { success: false, error: e?.message || "Failed to upload image" };
  }
}

export async function uploadImageUrlToCloudinary({
  imageUrl,
  folder = defaultFolder,
  publicId,
}) {
  if (!imageUrl) {
    return { success: false, error: "No image URL to upload" };
  }

  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    return await uploadImageToCloudinary({ dataUrl, folder, publicId });
  } catch (e) {
    return {
      success: false,
      error: e?.message || "Failed to convert image for upload",
    };
  }
}
