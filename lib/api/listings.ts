import type { SubleasePost } from "@/context/AppContext";
import { fetch as expoFetch } from "expo/fetch";
import { apiFetch, apiJson } from "./client";

function toSubleasePost(r: Record<string, unknown>): SubleasePost {
  return r as unknown as SubleasePost;
}

export async function fetchListings(): Promise<SubleasePost[]> {
  const res = await apiFetch("/api/listings", { auth: false, method: "GET" });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text}`);
  const rows = JSON.parse(text) as Record<string, unknown>[];
  return rows.map(toSubleasePost);
}

export async function createListing(body: Record<string, unknown>): Promise<SubleasePost> {
  const res = await apiJson<{ listing: Record<string, unknown> }>("/api/listings", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return toSubleasePost(res.listing);
}

export async function markListingLeased(id: string): Promise<void> {
  const res = await apiFetch(`/api/listings/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status}: ${t}`);
  }
}

export async function signListingImageUpload(
  listingId: string,
  fileExt: string,
): Promise<{ path: string; token: string; signedUrl: string; publicUrl: string }> {
  return apiJson(`/api/listings/${listingId}/images/sign`, {
    method: "POST",
    body: JSON.stringify({ fileExt }),
  });
}

export async function commitListingImage(listingId: string, path: string, sortOrder: number): Promise<void> {
  const res = await apiFetch(`/api/listings/${listingId}/images/commit`, {
    method: "POST",
    body: JSON.stringify({ path, sortOrder }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status}: ${t}`);
  }
}

export async function patchListingExtras(listingId: string, extras: Record<string, unknown>): Promise<void> {
  const res = await apiFetch(`/api/listings/${listingId}`, {
    method: "PATCH",
    body: JSON.stringify({ extras }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status}: ${t}`);
  }
}

export async function uploadLocalImageToSignedUrl(
  localUri: string,
  signedUrl: string,
  contentType: string,
): Promise<void> {
  const fileRes = await expoFetch(localUri);
  const blob = await fileRes.blob();
  const put = await expoFetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!put.ok) {
    const t = await put.text();
    throw new Error(`Upload failed ${put.status}: ${t}`);
  }
}
