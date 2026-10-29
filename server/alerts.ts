/**
 * Emails every admin (ADMIN_EMAILS) when a report comes in, through Resend's
 * HTTP API, so the 24-hour response App Review expects (guideline 1.2)
 * doesn't depend on someone remembering to check the queue.
 *
 *   RESEND_API_KEY       a Resend API key (sending access is enough)
 *   REPORTS_FROM_EMAIL   the sender, on a domain verified in Resend,
 *                        e.g. "PopMatch Reports <reports@your-domain>"
 *
 * The email says what was reported and why, never what a private message
 * said: that stays in the admin queue, behind sign-in. A failed send is
 * logged and the report is still saved; the queue is the record.
 */

export interface ReportAlert {
  id: number;
  targetType: string;
  reason: string;
  details: string;
  /** The reported student's display name. */
  ownerName: string;
}

const TYPE_LABELS: Record<string, string> = {
  profile: "a profile",
  listing: "a sublet listing",
  crash_post: "a Crash & Cash post",
  conversation: "a message thread",
};

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "").split(",").map(e => e.trim()).filter(Boolean);
}

/** Resolves true if Resend accepted the email; never throws. */
export async function sendReportAlert(report: ReportAlert): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.REPORTS_FROM_EMAIL;
  const to = adminEmails();
  if (!key || !from || to.length === 0) {
    console.error(
      `report ${report.id}: no alert email sent: set RESEND_API_KEY, REPORTS_FROM_EMAIL and ADMIN_EMAILS`
    );
    return false;
  }

  const what = TYPE_LABELS[report.targetType] ?? report.targetType;
  const text = [
    `A student reported ${what} by ${report.ownerName || "a student"}.`,
    ``,
    `Reason: ${report.reason}`,
    report.details ? `Details: ${report.details.slice(0, 500)}` : `Details: (none)`,
    ``,
    `Review it in the app: Profile -> tap the version number 5 times -> Admin -> Reports (report #${report.id}).`,
    `App Review expects a response within 24 hours: remove the content and, if warranted, ban the account.`,
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: `PopMatch report #${report.id}: ${report.reason} (${what})`, text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error(`report ${report.id}: Resend refused the alert (${res.status}): ${(await res.text()).slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`report ${report.id}: sending the alert failed`, err);
    return false;
  }
}
