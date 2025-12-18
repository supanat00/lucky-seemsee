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

function parseSignedCloudinaryUrl(raw) {
  // cloudinary://api_key:api_secret@cloud_name
  // NOTE: Storing api_secret in client is NOT safe; this is supported only because user explicitly wants it for LIFF.
  try {
    const u = new URL(raw);
    if (!u.hostname) return null;
    return {
      apiKey: decodeURIComponent(u.username || ""),
      apiSecret: decodeURIComponent(u.password || ""),
      cloudName: u.hostname,
    };
  } catch {
    return null;
  }
}

function resolveCloudinaryConfig() {
  const raw = (cloudinaryUrlEnv || "").trim();

  // 1) Signed mode: cloudinary://api_key:api_secret@cloud_name
  if (raw && /^cloudinary:\/\//i.test(raw)) {
    const signed = parseSignedCloudinaryUrl(raw);
    if (signed?.cloudName) {
      return {
        mode: "signed",
        uploadUrl: `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
        apiKey: signed.apiKey || "",
        apiSecret: signed.apiSecret || "",
      };
    }
  }

  // 2) Unsigned mode: user provides upload endpoint or cloud name
  if (raw && /^https?:\/\//i.test(raw)) {
    if (/\/image\/upload\/?$/i.test(raw))
      return { mode: "unsigned", uploadUrl: raw, apiKey: "", apiSecret: "" };
    if (/\/v1_1\/[^/]+\/?$/i.test(raw)) {
      return {
        mode: "unsigned",
        uploadUrl: `${raw.replace(/\/+$/, "")}/image/upload`,
        apiKey: "",
        apiSecret: "",
      };
    }
    return { mode: "unsigned", uploadUrl: raw, apiKey: "", apiSecret: "" };
  }

  if (cloudNameEnv) {
    return {
      mode: "unsigned",
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudNameEnv}/image/upload`,
      apiKey: "",
      apiSecret: "",
    };
  }

  return { mode: "unsigned", uploadUrl: "", apiKey: "", apiSecret: "" };
}

async function sha1Hex(input) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildCloudinarySignatureString(params) {
  // Cloudinary signature uses ONLY the parameters being signed, sorted by key.
  // Do NOT include: file, api_key, resource_type
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return entries.map(([k, v]) => `${k}=${v}`).join("&");
}

export async function uploadImageToCloudinary({
  dataUrl,
  folder = defaultFolder,
  publicId,
}) {
  const cfg = resolveCloudinaryConfig();
  const uploadUrl = cfg.uploadUrl;
  if (!uploadUrl) {
    return {
      success: false,
      error:
        "Cloudinary is not configured (missing VITE_CLOUDINARY_URL or VITE_CLOUDINARY_CLOUD_NAME)",
    };
  }
  if (!dataUrl) {
    return { success: false, error: "No image data to upload" };
  }

  try {
    // Compute deterministic public_id once
    const cleanFolder = (folder || "").replace(/^\/+|\/+$/g, "");
    const cleanId = publicId ? String(publicId).replace(/^\/+|\/+$/g, "") : "";
    const finalPublicId = cleanId
      ? cleanFolder
        ? `${cleanFolder}/${cleanId}`
        : cleanId
      : "";

    const formData = new FormData();
    formData.append("file", dataUrl);

    if (cfg.mode === "signed") {
      if (!cfg.apiKey || !cfg.apiSecret) {
        return {
          success: false,
          error:
            "Cloudinary signed upload requires VITE_CLOUDINARY_URL = cloudinary://api_key:api_secret@cloud_name",
        };
      }

      const timestamp = Math.floor(Date.now() / 1000);
      formData.append("api_key", cfg.apiKey);
      formData.append("timestamp", String(timestamp));

      if (finalPublicId) formData.append("public_id", finalPublicId);

      // Overwrite controls (signed mode)
      formData.append("overwrite", "true");
      formData.append("unique_filename", "false");
      formData.append("invalidate", "true");

      const paramsToSign = {
        invalidate: "true",
        overwrite: "true",
        public_id: finalPublicId,
        timestamp: String(timestamp),
        unique_filename: "false",
      };
      const base = buildCloudinarySignatureString(paramsToSign);
      const signature = await sha1Hex(`${base}${cfg.apiSecret}`);
      formData.append("signature", signature);
    } else {
      // unsigned preset mode
      if (!uploadPreset) {
        return {
          success: false,
          error:
            "Cloudinary is not configured (missing VITE_CLOUDINARY_UPLOAD_PRESET)",
        };
      }
      formData.append("upload_preset", uploadPreset);

      if (finalPublicId) {
        formData.append("public_id", finalPublicId);
      } else if (folder) {
        formData.append("folder", folder);
      }

      // Prefer overwrite (may be rejected by preset; we retry without these fields below)
      formData.append("overwrite", "true");
      formData.append("unique_filename", "false");
      formData.append("invalidate", "true");
    }

    const tryUpload = async (fd) => {
      const res = await fetch(uploadUrl, { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      return { res, json };
    };

    let { res, json } = await tryUpload(formData);

    if (!res.ok) {
      const msg = json?.error?.message || `Upload failed: ${res.status}`;

      // Unsigned-only retry without overwrite params if preset rejects them.
      if (cfg.mode === "unsigned") {
        const looksLikeParamError =
          /unknown\s+parameter|invalid\s+parameter|not\s+allowed|unexpected/i.test(
            msg
          );

        if (looksLikeParamError) {
          const fd2 = new FormData();
          fd2.append("file", dataUrl);
          fd2.append("upload_preset", uploadPreset);

          if (finalPublicId) {
            fd2.append("public_id", finalPublicId);
          } else if (folder) {
            fd2.append("folder", folder);
          }

          ({ res, json } = await tryUpload(fd2));
        }
      }
    }

    if (!res.ok) {
      throw new Error(json?.error?.message || `Upload failed: ${res.status}`);
    }

    return {
      success: true,
      url: json.secure_url,
      publicId: json.public_id,
      version: json.version,
    };
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
