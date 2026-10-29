import { apiRequest } from "@/lib/query-client";

/**
 * Reports go to the `reports` table and email the admins. The server works
 * out who owns the reported thing and keeps a copy of it as it is now.
 */

export type ReportTarget = "profile" | "listing" | "crash_post" | "conversation";

export const REPORT_REASONS = [
  { id: "spam", label: "Spam" },
  { id: "scam", label: "Scam or fraud" },
  { id: "harassment", label: "Harassment" },
  { id: "hate", label: "Hate speech" },
  { id: "sexual", label: "Sexual content" },
  { id: "violence", label: "Violence or threats" },
  { id: "impersonation", label: "Pretending to be someone" },
  { id: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["id"];

export async function sendReport(targetType: ReportTarget, targetId: string, reason: ReportReason, details: string): Promise<void> {
  await apiRequest("POST", "/api/reports", { targetType, targetId, reason, details });
}

/**
 * Where students can reach the team (guideline 1.2 "published contact
 * information"). Set EXPO_PUBLIC_SUPPORT_EMAIL; unset hides the contact rows.
 */
export const SUPPORT_EMAIL = (process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? "").trim();
