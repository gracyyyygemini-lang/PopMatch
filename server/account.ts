import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import getPool from "./db";

/**
 * Account deletion (App Store guideline 5.1.1(v)): everything a person left
 * behind, in the order that keeps each step safe to retry.
 *
 *   1. Photos in Storage, under their auth id's folder in each bucket.
 *   2. Every row about them, in one transaction (all or nothing).
 *   3. Their Supabase Auth user, so they can't sign back in to an empty shell.
 *
 * If a step fails the request fails and the client says so; running it again
 * picks up where it stopped (each step skips what's already gone). The table
 * list matches the review-account cleanup SQL in SETUP.md.
 */

export const PHOTO_BUCKETS = ["avatars", "listing-photos"];

/** Who to delete: users.id may be null if their profile never saved. */
export interface DeletionTarget {
  authId: string;
  email: string;
  userId: string | null;
}

/** Service-role client, or null when SUPABASE_SERVICE_ROLE_KEY isn't set. */
export function adminClient(supabaseUrl: string): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Every object path under `folder`, depth-first (list() returns one level). */
async function listAll(admin: SupabaseClient, bucket: string, folder: string): Promise<string[]> {
  const paths: string[] = [];
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin.storage.from(bucket).list(folder, { limit: PAGE, offset });
    if (error) throw new Error(`listing ${bucket}/${folder}: ${error.message}`);
    for (const item of data ?? []) {
      const path = `${folder}/${item.name}`;
      // Folders come back with no id.
      if (item.id) paths.push(path);
      else paths.push(...(await listAll(admin, bucket, path)));
    }
    if (!data || data.length < PAGE) return paths;
  }
}

async function deletePhotos(admin: SupabaseClient, authId: string): Promise<number> {
  let removed = 0;
  for (const bucket of PHOTO_BUCKETS) {
    const paths = await listAll(admin, bucket, authId);
    for (let i = 0; i < paths.length; i += 1000) {
      const batch = paths.slice(i, i + 1000);
      const { error } = await admin.storage.from(bucket).remove(batch);
      if (error) throw new Error(`removing from ${bucket}: ${error.message}`);
      removed += batch.length;
    }
  }
  return removed;
}

/**
 * Each statement with what it's keyed on: users.id (null if their profile
 * never saved) or the lowercased email. Messages go first: the other
 * person's side of each thread is deleted along with the thread.
 */
const DELETE_ROWS: [string, "id" | "email" | "both"][] = [
  [`DELETE FROM messages WHERE conversation_id IN (
     SELECT id FROM conversations WHERE $1::varchar IN (participant1_id, participant2_id))`, "id"],
  [`DELETE FROM messages WHERE sender_id = $1::varchar`, "id"],
  [`DELETE FROM conversations WHERE $1::varchar IN (participant1_id, participant2_id)`, "id"],
  [`DELETE FROM listings WHERE user_id = $1::varchar`, "id"],
  [`DELETE FROM crash_posts WHERE user_id = $1::varchar`, "id"],
  [`DELETE FROM likes WHERE $1::varchar IN (liker_email, liked_email)`, "email"],
  [`DELETE FROM passes WHERE $1::varchar IN (passer_email, passed_email)`, "email"],
  [`DELETE FROM friend_adds WHERE $1::varchar IN (adder_email, added_email)`, "email"],
  [`DELETE FROM vouches WHERE $2::varchar IN (voucher_email, vouchee_email)
     OR $1::varchar IN (voucher_id, vouchee_id)`, "both"],
  [`DELETE FROM feedback WHERE lower(user_email) = $1::varchar`, "email"],
  [`DELETE FROM users WHERE id = $1::varchar OR lower(email) = $2::varchar`, "both"],
];

async function deleteRows(userId: string | null, email: string): Promise<number> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    let removed = 0;
    for (const [sql, key] of DELETE_ROWS) {
      const params = key === "id" ? [userId] : key === "email" ? [email] : [userId, email];
      removed += (await client.query(sql, params)).rowCount ?? 0;
    }
    await client.query("COMMIT");
    return removed;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function deleteAuthUser(admin: SupabaseClient, authId: string): Promise<void> {
  const { error } = await admin.auth.admin.deleteUser(authId);
  // Already gone (an earlier attempt got this far): nothing left to do.
  if (error && error.status !== 404) throw new Error(`deleting the sign-in: ${error.message}`);
}

export async function deleteAccount(admin: SupabaseClient, target: DeletionTarget) {
  const photos = await deletePhotos(admin, target.authId);
  const rows = await deleteRows(target.userId, target.email);
  await deleteAuthUser(admin, target.authId);
  return { photos, rows };
}
