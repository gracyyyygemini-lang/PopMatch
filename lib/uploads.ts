import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

/**
 * Public bucket holding profile pictures. Create it once in the Supabase
 * dashboard (Storage -> New bucket -> name "avatars", Public enabled).
 */
export const AVATAR_BUCKET = "avatars";

const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Index of a base64 char; 0 for the absent chars of a short final group. */
function sextet(char: string | undefined): number {
  if (char === undefined) return 0;
  const index = BASE64_CHARS.indexOf(char);
  return index < 0 ? 0 : index;
}

/** Dependency-free base64 decode; React Native has no reliable global atob. */
function base64ToBytes(base64: string): Uint8Array {
  // The regex already strips "=" padding, so the byte count follows directly
  // from the remaining character count — subtracting padding again truncates.
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, "");
  const byteLength = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(byteLength);

  let byteIndex = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const chunk =
      (sextet(clean[i]) << 18) |
      (sextet(clean[i + 1]) << 12) |
      (sextet(clean[i + 2]) << 6) |
      sextet(clean[i + 3]);

    if (byteIndex < byteLength) bytes[byteIndex++] = (chunk >> 16) & 0xff;
    if (byteIndex < byteLength) bytes[byteIndex++] = (chunk >> 8) & 0xff;
    if (byteIndex < byteLength) bytes[byteIndex++] = chunk & 0xff;
  }

  return bytes;
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

function extensionFor(contentType: string): string {
  const subtype = contentType.split("/")[1]?.split("+")[0] ?? "jpg";
  return subtype === "jpeg" ? "jpg" : subtype;
}

/**
 * Uploads a locally-picked image to Supabase Storage and returns a public URL
 * that works on any device. Without this, ImagePicker's file:// URI only
 * resolves on the phone that picked it.
 */
export async function uploadProfileImage(
  userId: string,
  localUri: string
): Promise<string> {
  // Already uploaded (re-saving an unchanged profile) — nothing to do.
  if (/^https?:\/\//i.test(localUri)) return localUri;

  const response = await fetch(localUri);
  if (!response.ok) throw new Error("Could not read the selected image.");

  const blob = await response.blob();
  const contentType = blob.type || "image/jpeg";
  const path = `${userId}/avatar-${Date.now()}.${extensionFor(contentType)}`;

  // Web accepts the Blob directly; React Native needs raw bytes.
  let body: Blob | Uint8Array;
  if (Platform.OS === "web") {
    body = blob;
  } else {
    const dataUrl = await readAsDataUrl(blob);
    body = base64ToBytes(dataUrl.split(",")[1] ?? "");
  }

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, body, { contentType, upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
