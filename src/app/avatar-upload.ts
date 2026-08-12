// ─── AVATAR UPLOAD ───────────────────────────────────────────────────────────
//
// Turning a file the user picked into something safe to store and show. Three
// separate steps, deliberately, because the UI needs to stop between them:
//
//   validateImageFile()  →  reject the wrong type or an oversized file *before*
//                           reading megabytes into memory
//   readImageFile()      →  decode it, so a file that only claims to be an
//                           image is caught, and produce the preview
//   toAvatarDataUrl()    →  centre-crop to a square and downscale, which is
//                           what actually gets saved
//
// The picked file is never what gets stored. A 12MP phone photo becomes a
// 512×512 crop, which keeps the avatar sharp at every size it renders at while
// staying small enough to persist — and it is also exactly the preprocessing a
// real client should do before uploading.
//
// ── Replacing this with a real backend ──────────────────────────────────────
// `toAvatarDataUrl` output goes to `updateAvatar()` in `auth-store.ts`, which is
// the seam for `POST /me/avatar`. Use `dataUrlToBlob` there to build the
// multipart body. Client-side checks are for feedback only — the server must
// re-validate type, size and dimensions, since anything here can be bypassed.

import { type Result } from "./auth-store";

// ─── LIMITS ──────────────────────────────────────────────────────────────────

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

/** For the file input's `accept`, and the hint under the picker. */
export const ACCEPT_ATTRIBUTE = ACCEPTED_TYPES.join(",");
export const ACCEPTED_LABEL = "JPG, PNG, WebP or GIF";

export const MAX_BYTES = 8 * 1024 * 1024;
export const MAX_LABEL = "8MB";

/** Below this an avatar looks soft at the 96px header size, so it is rejected. */
export const MIN_DIMENSION = 96;

/** Stored avatars are square. 512 covers every size the app renders at. */
export const OUTPUT_SIZE = 512;

export interface PickedImage {
  /** The original, full-size image — used for the preview only. */
  dataUrl: string;
  width: number;
  height: number;
  name: string;
  bytes: number;
}

// ─── VALIDATION ──────────────────────────────────────────────────────────────

const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)}MB`;

/** Cheap checks first: type and size, straight off the file handle. */
export function validateImageFile(file: File): Result<File> {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    // A file with no type at all reads as "" — name the accepted set instead of
    // echoing something unhelpful back at the user.
    return { ok: false, error: `That file is not an image we can use. Pick a ${ACCEPTED_LABEL} file.` };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: `That image is ${mb(file.size)}. The limit is ${MAX_LABEL}.` };
  }
  if (file.size === 0) {
    return { ok: false, error: "That file is empty. Pick another image." };
  }
  return { ok: true, value: file };
}

// ─── READING ─────────────────────────────────────────────────────────────────

function readAsDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function decode(dataUrl: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * Validates, reads and decodes. Decoding is the real check — a `.exe` renamed
 * to `.png` passes the type check on some platforms but never decodes.
 */
export async function readImageFile(file: File): Promise<Result<PickedImage>> {
  const valid = validateImageFile(file);
  if (!valid.ok) return valid;

  const dataUrl = await readAsDataUrl(file);
  if (!dataUrl) return { ok: false, error: "That file could not be read. Try picking it again." };

  const img = await decode(dataUrl);
  if (!img) return { ok: false, error: "That file is not a valid image." };

  if (img.naturalWidth < MIN_DIMENSION || img.naturalHeight < MIN_DIMENSION) {
    return {
      ok: false,
      error: `That image is ${img.naturalWidth}×${img.naturalHeight}. Use one at least ${MIN_DIMENSION}×${MIN_DIMENSION}.`,
    };
  }

  return {
    ok: true,
    value: { dataUrl, width: img.naturalWidth, height: img.naturalHeight, name: file.name, bytes: file.size },
  };
}

// ─── CROP & DOWNSCALE ────────────────────────────────────────────────────────

/**
 * Centre-crops to a square and scales to `size`. The crop matches what the
 * preview shows, so what the user approved is what gets saved.
 *
 * Animated GIFs are flattened to their first frame — avatars are static
 * everywhere they appear, so an animated one would be misleading anyway.
 */
export async function toAvatarDataUrl(image: PickedImage, size = OUTPUT_SIZE): Promise<Result<string>> {
  const img = await decode(image.dataUrl);
  if (!img) return { ok: false, error: "That image could not be processed. Try another one." };

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { ok: false, error: "This browser cannot process images. Try another browser." };

  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;

  ctx.imageSmoothingQuality = "high";
  // Transparent source pixels would encode as black in JPEG, so lay down white
  // first — the same thing a real upload pipeline does when it flattens.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

  // WebP where it encodes (smaller at the same quality); JPEG otherwise. A
  // canvas asked for a format it cannot encode silently returns PNG, so the
  // result is checked rather than assumed.
  const webp = canvas.toDataURL("image/webp", 0.86);
  const dataUrl = webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.86);
  return { ok: true, value: dataUrl };
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Byte size of a data URL's payload, for the "saved as …" hint. */
export const dataUrlBytes = (dataUrl: string) => {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.round((base64.length * 3) / 4);
};

export const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024 ? mb(bytes) : `${Math.max(1, Math.round(bytes / 1024))}KB`;

/** The multipart body a real `POST /me/avatar` needs. Unused until then. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const type = header.slice(header.indexOf(":") + 1, header.indexOf(";"));
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}
