import type { SupabaseClient } from "@supabase/supabase-js";
import getPool from "./db";

/**
 * Acting on a report (App Store guideline 1.2: remove the content and eject
 * the user, within 24 hours). Called only from the admin routes.
 */

export type Decision = "dismiss" | "remove" | "ban" | "remove_and_ban";
export const DECISIONS: Decision[] = ["dismiss", "remove", "ban", "remove_and_ban"];

interface ReportRow {
  id: number; target_type: string; target_id: string; target_user_id: string; status: string;
}

type Client = { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }> };

/** Takes the reported thing down. Returns what was removed, for the note. */
async function removeContent(db: Client, type: string, id: string): Promise<string> {
  if (type === "listing") {
    const r = await db.query("DELETE FROM listings WHERE id = $1", [id]);
    return r.rowCount ? "listing deleted" : "listing was already gone";
  }
  if (type === "crash_post") {
    const r = await db.query("DELETE FROM crash_posts WHERE id = $1", [id]);
    return r.rowCount ? "Crash & Cash post deleted" : "post was already gone";
  }
  if (type === "conversation") {
    await db.query("DELETE FROM messages WHERE conversation_id = $1", [id]);
    const r = await db.query("DELETE FROM conversations WHERE id = $1", [id]);
    return r.rowCount ? "conversation and its messages deleted" : "conversation was already gone";
  }
  // A profile: clear what they wrote and their photo. Their name and
  // preferences stay; banning is how a whole account goes.
  const r = await db.query(
    `UPDATE users SET bio = '', profile_image = '',
       vibe_profile = CASE WHEN vibe_profile IS NULL THEN NULL ELSE vibe_profile - 'prompt' - 'promptAnswer' END
     WHERE id = $1`,
    [id]
  );
  return r.rowCount ? "profile bio, photo and prompt answer cleared" : "profile was already gone";
}

export interface Resolution {
  status: "actioned" | "dismissed";
  done: string[];
  /** Things that couldn't be done; the admin should know. */
  warnings: string[];
}

/**
 * Applies `decision` to report `reportId`. Database changes are one
 * transaction; the Supabase sign-in ban (needs the service key) runs after
 * it and is reported as a warning if it can't be done, since the API-side ban
 * already locks them out.
 */
export async function resolveReport(
  reportId: number, decision: Decision, note: string, adminEmail: string, admin: SupabaseClient | null,
): Promise<Resolution | null> {
  const client = await getPool().connect();
  const done: string[] = [];
  const warnings: string[] = [];
  let banEmail: string | null = null;
  let status: Resolution["status"];
  try {
    await client.query("BEGIN");
    const { rows: [report] } = await client.query<ReportRow>("SELECT * FROM reports WHERE id = $1 FOR UPDATE", [reportId]);
    if (!report) { await client.query("ROLLBACK"); return null; }

    status = decision === "dismiss" ? "dismissed" : "actioned";
    if (decision === "remove" || decision === "remove_and_ban") {
      done.push(await removeContent(client, report.target_type, report.target_id));
    }
    if (decision === "ban" || decision === "remove_and_ban") {
      const { rows: [owner] } = await client.query<{ email: string }>(
        "SELECT lower(email) AS email FROM users WHERE id = $1", [report.target_user_id]
      );
      if (!owner) {
        warnings.push("Couldn't ban: that student's profile no longer exists (they may have deleted their account).");
      } else {
        await client.query(
          `INSERT INTO bans (email, reason, banned_by, report_id) VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO NOTHING`,
          [owner.email, note, adminEmail, report.id]
        );
        banEmail = owner.email;
        done.push("account banned: signed out of the API and hidden everywhere");
      }
    }

    const fullNote = [note, ...done].filter(Boolean).join(" · ");
    await client.query(
      `UPDATE reports SET status = $2, resolved_at = NOW(), resolved_by = $3, resolution_note = $4 WHERE id = $1`,
      [report.id, status, adminEmail, fullNote]
    );
    // Other open reports of the same thing are settled by this one.
    if (decision !== "dismiss") {
      await client.query(
        `UPDATE reports SET status = 'actioned', resolved_at = NOW(), resolved_by = $4,
           resolution_note = 'Resolved with report #' || $1::text
         WHERE status = 'open' AND id <> $1 AND target_type = $2 AND target_id = $3`,
        [report.id, report.target_type, report.target_id, adminEmail]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  // The sign-in ban, so they can't sign in or refresh a session either.
  if (banEmail) {
    if (!admin) {
      warnings.push("Banned in the app, but not in Supabase Auth: SUPABASE_SERVICE_ROLE_KEY isn't set. Ban them under Authentication → Users too.");
    } else {
      const { rows: [authUser] } = await getPool().query<{ id: string }>(
        "SELECT id FROM auth.users WHERE lower(email) = $1", [banEmail]
      );
      if (!authUser) {
        warnings.push("Banned in the app; no Supabase sign-in exists for that email.");
      } else {
        const { error } = await admin.auth.admin.updateUserById(authUser.id, { ban_duration: "876000h" });
        if (error) warnings.push(`Banned in the app, but the Supabase sign-in ban failed: ${error.message}`);
        else done.push("Supabase sign-in banned");
      }
    }
  }
  return { status, done, warnings };
}
