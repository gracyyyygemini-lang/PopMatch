import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null;
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export function isSupabaseMvpEnabled(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function publicStorageUrl(bucket: string, path: string): string {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const encoded = path.split("/").map((seg) => encodeURIComponent(seg)).join("/");
  return `${base}/storage/v1/object/public/${bucket}/${encoded}`;
}
