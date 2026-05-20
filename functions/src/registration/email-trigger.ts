/**
 * Cloud Function: onRegStudentCreated
 *
 * Firestore trigger that fires when a new `regStudents/{id}` document is
 * written, then:
 *   1. Reads the (optional) `regSettings/email-recipients` doc for the
 *      admin's preferred recipient list, falling back to the bootstrap
 *      defaults baked into the codebase.
 *   2. Sends a transactional email via Resend with the new-student details.
 *   3. Updates the matching `regNotifications` row (created on the client
 *      side) with `emailSent: true` so the in-app inbox shows delivery
 *      status.
 *
 * Resend API key lives in the function's runtime config:
 *   firebase functions:secrets:set RESEND_API_KEY
 *
 * Domain `langford.website` must be verified in Resend (TXT/CNAME) before
 * deliverability is reliable. Setup steps in docs/registration-module.md.
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { Resend } from "resend";

// Bootstrap defaults — mirror src/lib/registration/constants.ts. Kept in
// sync manually because the functions package can't import from the
// main app's source tree.
const DEFAULT_ADMIN_RECIPIENTS = ["ahmedelsayed@langfordkw.com"];
const DEFAULT_FROM = "Langford × Acceptix <noreply@langford.website>";
const DEFAULT_REPLY_TO = "ahmedelsayed@langfordkw.com";

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

interface EmailRecipientsSettings {
  enabled?: boolean;
  recipients?: string[];
  replyTo?: string;
  from?: string;
}

async function loadSettings(): Promise<EmailRecipientsSettings> {
  try {
    const snap = await admin
      .firestore()
      .doc("regSettings/email-recipients")
      .get();
    return snap.exists ? (snap.data() as EmailRecipientsSettings) ?? {} : {};
  } catch (e) {
    console.warn("[email-trigger] could not load settings — using defaults:", e);
    return {};
  }
}

function escapeHtml(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderEmailHtml(input: {
  studentName: string;
  agentName: string;
  courseName: string;
  courseFee: number;
  currency: string;
  commissionAmount: number;
  phone: string;
  email?: string | null;
  studentId: string;
}): string {
  const fee = input.courseFee.toLocaleString("en-US");
  const commission = input.commissionAmount.toLocaleString("en-US");
  return `<!doctype html>
<html lang="en" dir="ltr">
<body style="font-family:'Inter','Helvetica Neue',Arial,sans-serif;color:#111827;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:white;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <div style="background:#1e40af;color:white;padding:16px 20px;">
      <h1 style="margin:0;font-size:18px;">New student registered via Acceptix</h1>
    </div>
    <div style="padding:20px;">
      <p style="margin:0 0 16px;font-size:14px;color:#374151;">
        A new student has been registered by <strong>${escapeHtml(input.agentName)}</strong>.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:120px;">Name</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(input.studentName)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Course</td><td style="padding:8px 0;">${escapeHtml(input.courseName)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Phone</td><td style="padding:8px 0;">${escapeHtml(input.phone)}</td></tr>
        ${input.email ? `<tr><td style="padding:8px 0;color:#6b7280;">Email</td><td style="padding:8px 0;">${escapeHtml(input.email)}</td></tr>` : ""}
        <tr><td style="padding:8px 0;color:#6b7280;">Fee</td><td style="padding:8px 0;">${fee} ${escapeHtml(input.currency)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Commission (10%)</td><td style="padding:8px 0;color:#1e40af;font-weight:700;">${commission} ${escapeHtml(input.currency)}</td></tr>
      </table>

      <p style="margin:24px 0 0;font-size:12px;color:#6b7280;">
        Langford × Acceptix Registration · ${escapeHtml(input.studentId)}
      </p>
    </div>
  </div>
</body>
</html>`;
}

export const onRegStudentCreated = onDocumentCreated(
  {
    document: "regStudents/{studentId}",
    region: "us-central1",
    secrets: [RESEND_API_KEY],
  },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      console.warn("[email-trigger] no snapshot — aborting");
      return;
    }
    const data = snap.data() ?? {};
    const studentId = event.params.studentId;

    // Compose the payload
    const payload = {
      studentName: (data.fullName as string) || "Unknown",
      agentName: (data.createdByName as string) || "Unknown",
      courseName: (data.courseName as string) || "Unknown",
      courseFee: (data.courseFee as number) || 0,
      currency: (data.currency as string) || "KWD",
      commissionAmount: (data.commissionAmount as number) || 0,
      phone: (data.phone as string) || "",
      email: (data.email as string | null) ?? null,
      studentId,
    };

    // ── Load runtime settings + resolve recipients ───────────────────────
    const settings = await loadSettings();
    if (settings.enabled === false) {
      console.info("[email-trigger] notifications disabled by settings — skipping");
      return;
    }
    const recipients =
      settings.recipients && settings.recipients.length > 0
        ? settings.recipients
        : DEFAULT_ADMIN_RECIPIENTS;
    const from = settings.from || DEFAULT_FROM;
    const replyTo = settings.replyTo || DEFAULT_REPLY_TO;

    // ── Send via Resend ─────────────────────────────────────────────────
    const apiKey = RESEND_API_KEY.value();
    if (!apiKey) {
      console.error(
        "[email-trigger] RESEND_API_KEY not configured — skipping (set with `firebase functions:secrets:set RESEND_API_KEY`)"
      );
      return;
    }
    const resend = new Resend(apiKey);

    let sentOk = false;
    try {
      const res = await resend.emails.send({
        from,
        to: recipients,
        replyTo,
        subject: `New student: ${payload.studentName} — ${payload.courseName}`,
        html: renderEmailHtml(payload),
      });
      if (res.error) {
        console.error("[email-trigger] Resend returned error:", res.error);
      } else {
        sentOk = true;
      }
    } catch (e) {
      console.error("[email-trigger] send failed:", e);
    }

    // ── Update the matching notification row with delivery status ───────
    try {
      const notifQuery = await admin
        .firestore()
        .collection("regNotifications")
        .where("entityType", "==", "regStudent")
        .where("entityId", "==", studentId)
        .limit(1)
        .get();

      if (!notifQuery.empty) {
        const notifDoc = notifQuery.docs[0];
        await notifDoc.ref.update({
          emailSent: sentOk,
          emailSentAt: sentOk
            ? admin.firestore.FieldValue.serverTimestamp()
            : null,
          emailRecipients: sentOk ? recipients : [],
        });
      }
    } catch (e) {
      console.warn("[email-trigger] notification update failed (non-blocking):", e);
    }
  }
);
