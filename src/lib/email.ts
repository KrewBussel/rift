import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const FROM = "Rift <onboarding@resend.dev>"; // replace with verified domain in production

// ─── Shared styles ───────────────────────────────────────────────────────────

function baseTemplate(title: string, previewText: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f8f9fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding:0 0 24px 0;">
              <span style="font-size:18px;font-weight:700;color:#111318;letter-spacing:-0.3px;">Rift</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;padding:32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                You're receiving this because you have an account on Rift.
                <br/>Manage your notification preferences in
                <a href="${APP_URL}/dashboard/settings" style="color:#2563eb;text-decoration:none;">Settings</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function sectionTitle(text: string): string {
  return `<p style="margin:0 0 16px 0;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">${text}</p>`;
}

function itemRow(
  title: string,
  meta: string,
  href: string,
  badge?: { text: string; color: string }
): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <a href="${href}" style="font-size:14px;font-weight:500;color:#111318;text-decoration:none;">${title}</a>
            <p style="margin:2px 0 0 0;font-size:12px;color:#9ca3af;">${meta}</p>
          </td>
          ${badge ? `<td align="right" style="white-space:nowrap;">
            <span style="display:inline-block;background:${badge.color};border-radius:9999px;padding:2px 10px;font-size:11px;font-weight:600;color:#fff;">${badge.text}</span>
          </td>` : ""}
        </tr>
      </table>
    </td>
  </tr>`;
}

function ctaButton(text: string, href: string): string {
  return `<p style="margin:24px 0 0 0;">
    <a href="${href}" style="display:inline-block;background:#2563eb;color:#fff;font-size:14px;font-weight:500;text-decoration:none;padding:10px 20px;border-radius:8px;">${text}</a>
  </p>`;
}

// ─── Email: Overdue Tasks Digest ─────────────────────────────────────────────

export interface OverdueTaskItem {
  taskTitle: string;
  caseId: string;
  clientName: string;
  daysOverdue: number;
}

export function buildOverdueTasksEmail(
  recipientName: string,
  tasks: OverdueTaskItem[]
): { subject: string; html: string } {
  const count = tasks.length;
  const subject = `${count} overdue task${count !== 1 ? "s" : ""} need your attention`;

  const rows = tasks
    .map((t) =>
      itemRow(
        t.taskTitle,
        `${t.clientName} · ${t.daysOverdue}d overdue`,
        `${APP_URL}/dashboard/cases/${t.caseId}`,
        { text: `${t.daysOverdue}d overdue`, color: "#ef4444" }
      )
    )
    .join("");

  const body = `
    <h2 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:#111318;">Hi ${recipientName},</h2>
    <p style="margin:0 0 24px 0;font-size:15px;color:#374151;">
      You have <strong>${count} overdue task${count !== 1 ? "s" : ""}</strong> assigned to you in Rift.
    </p>
    ${sectionTitle("Overdue Tasks")}
    <table width="100%" cellpadding="0" cellspacing="0">
      ${rows}
    </table>
    ${ctaButton("View My Tasks", `${APP_URL}/dashboard`)}
  `;

  return { subject, html: baseTemplate(subject, `${count} tasks past their due date`, body) };
}

// ─── Email: Stalled Cases Digest ─────────────────────────────────────────────

export interface StalledCaseItem {
  caseId: string;
  clientName: string;
  status: string;
  daysIdle: number;
  assignedAdvisor: string | null;
}

export function buildStalledCasesEmail(
  recipientName: string,
  cases: StalledCaseItem[],
  thresholdDays: number
): { subject: string; html: string } {
  const count = cases.length;
  const subject = `${count} case${count !== 1 ? "s" : ""} stalled for ${thresholdDays}+ days`;

  const STATUS_LABELS: Record<string, string> = {
    INTAKE: "Intake",
    AWAITING_CLIENT_ACTION: "Awaiting Client Action",
    READY_TO_SUBMIT: "Ready to Submit",
    SUBMITTED: "Submitted",
    PROCESSING: "Processing",
    IN_TRANSIT: "In Transit",
  };

  const rows = cases
    .map((c) =>
      itemRow(
        c.clientName,
        `${STATUS_LABELS[c.status] ?? c.status}${c.assignedAdvisor ? ` · ${c.assignedAdvisor}` : ""}`,
        `${APP_URL}/dashboard/cases/${c.caseId}`,
        { text: `${c.daysIdle}d idle`, color: "#f97316" }
      )
    )
    .join("");

  const body = `
    <h2 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:#111318;">Hi ${recipientName},</h2>
    <p style="margin:0 0 24px 0;font-size:15px;color:#374151;">
      <strong>${count} rollover case${count !== 1 ? "s" : ""}</strong> ${count !== 1 ? "have" : "has"} had no activity
      for <strong>${thresholdDays}+ days</strong> and may need a follow-up.
    </p>
    ${sectionTitle("Stalled Cases")}
    <table width="100%" cellpadding="0" cellspacing="0">
      ${rows}
    </table>
    ${ctaButton("Review Cases", `${APP_URL}/dashboard`)}
  `;

  return { subject, html: baseTemplate(subject, `${count} cases need attention`, body) };
}

// ─── Email: Missing Documents Digest ─────────────────────────────────────────

export interface MissingDocCase {
  caseId: string;
  clientName: string;
  missingItems: string[];
}

export function buildMissingDocsEmail(
  recipientName: string,
  cases: MissingDocCase[]
): { subject: string; html: string } {
  const count = cases.length;
  const subject = `${count} case${count !== 1 ? "s" : ""} have missing required documents`;

  const rows = cases
    .map((c) => {
      const missing = c.missingItems.slice(0, 3).join(", ") + (c.missingItems.length > 3 ? ` +${c.missingItems.length - 3} more` : "");
      return itemRow(
        c.clientName,
        `Missing: ${missing}`,
        `${APP_URL}/dashboard/cases/${c.caseId}`,
        { text: `${c.missingItems.length} missing`, color: "#7c3aed" }
      );
    })
    .join("");

  const body = `
    <h2 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:#111318;">Hi ${recipientName},</h2>
    <p style="margin:0 0 24px 0;font-size:15px;color:#374151;">
      <strong>${count} case${count !== 1 ? "s" : ""}</strong> still have required documents outstanding.
    </p>
    ${sectionTitle("Missing Documents")}
    <table width="100%" cellpadding="0" cellspacing="0">
      ${rows}
    </table>
    ${ctaButton("Review Checklists", `${APP_URL}/dashboard`)}
  `;

  return { subject, html: baseTemplate(subject, `${count} cases missing required documents`, body) };
}

// ─── Password reset ───────────────────────────────────────────────────────────

export function buildPasswordResetEmail(resetUrl: string, firstName: string): { subject: string; html: string } {
  const subject = "Reset your Rift password";
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#111318;">Reset your password</h1>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#374151;">
      Hi ${firstName}, we received a request to reset your Rift password. Click the button below to choose a new one.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="background:#2563eb;border-radius:8px;">
          <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;">
            Reset password
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">
      This link expires in 30 minutes and can only be used once.
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280;">
      If you didn't request this, you can ignore this email — your password won't change.
    </p>
  `;
  return { subject, html: baseTemplate(subject, "Reset your Rift password", body) };
}

// ─── Send helpers ─────────────────────────────────────────────────────────────

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith("re_placeholder")) {
    console.log(`[email] RESEND_API_KEY not set — would send to ${to}: "${subject}"`);
    return false;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) {
    console.error("[email] Send failed:", error);
    return false;
  }
  return true;
}
