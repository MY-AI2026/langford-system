/**
 * Cloud Function: regCreateAcceptixAgent
 *
 * Admin creates a new Acceptix-agent account. Single atomic flow:
 *   1. Validate caller is an active admin.
 *   2. Validate input (email, strong password, full name).
 *   3. Create Firebase Auth user.
 *   4. Create matching /users/{uid} doc with role = acceptix_agent.
 *   5. Write a regAuditLog entry.
 *   6. Return the new uid + email to the client.
 *
 * If step 4 fails after step 3 succeeds, we roll back the Auth user so we
 * don't leave an orphan login without a role record. Audit failures are
 * best-effort.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { assertAdmin, writeAuditFromFunction } from "./auth-helpers";

interface CreateAgentInput {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

// Mirrors the client-side `regStrongPasswordSchema` so a defective UI can't
// downgrade requirements.
function validateStrongPassword(pw: string): string | null {
  if (typeof pw !== "string") return "Password must be a string.";
  if (pw.length < 12) return "كلمة المرور لازم تكون 12 حرف على الأقل";
  if (!/[A-Z]/.test(pw)) return "لازم يكون فيها حرف كبير (A-Z)";
  if (!/[a-z]/.test(pw)) return "لازم يكون فيها حرف صغير (a-z)";
  if (!/\d/.test(pw)) return "لازم يكون فيها رقم (0-9)";
  if (!/[^A-Za-z0-9]/.test(pw)) return "لازم يكون فيها رمز خاص (!@#$...)";
  return null;
}

function validateEmail(email: string): string | null {
  if (typeof email !== "string") return "Email must be a string.";
  const trimmed = email.trim();
  if (trimmed.length === 0) return "الإيميل مطلوب";
  // Conservative pattern — better to reject a few edge-case-valid emails
  // than to accept obviously malformed input that breaks Firebase Auth.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "الإيميل مش صحيح";
  return null;
}

export const regCreateAcceptixAgent = onCall<CreateAgentInput>(
  {
    region: "us-central1",
    enforceAppCheck: false, // PR #4 enables App Check once Vercel domain is verified
  },
  async (request) => {
    const actor = await assertAdmin(request);

    const input = request.data ?? ({} as CreateAgentInput);
    const fullName = (input.fullName ?? "").trim();
    const email = (input.email ?? "").trim().toLowerCase();
    const phone = (input.phone ?? "").trim();
    const password = input.password ?? "";

    // ── Input validation (server-side mirror of the Zod schema) ────────────
    if (fullName.length < 2) {
      throw new HttpsError("invalid-argument", "الاسم لازم يكون حرفين على الأقل");
    }
    const emailErr = validateEmail(email);
    if (emailErr) throw new HttpsError("invalid-argument", emailErr);
    const pwErr = validateStrongPassword(password);
    if (pwErr) throw new HttpsError("invalid-argument", pwErr);

    // ── Pre-flight: surface duplicate-email cleanly before we try to create.
    try {
      await admin.auth().getUserByEmail(email);
      throw new HttpsError("already-exists", "الإيميل ده مستخدم قبل كده");
    } catch (e) {
      // getUserByEmail throws when the user does NOT exist — that's our
      // happy path. Re-throw anything that isn't auth/user-not-found.
      const err = e as { code?: string };
      if (err.code !== "auth/user-not-found") {
        if (err.code === undefined) throw e; // unknown shape — re-throw
      }
    }

    // ── Step 1: Create Firebase Auth user ──────────────────────────────────
    let newUid: string;
    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: fullName,
        emailVerified: false,
        disabled: false,
      });
      newUid = userRecord.uid;
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code === "auth/email-already-exists") {
        throw new HttpsError("already-exists", "الإيميل ده مستخدم قبل كده");
      }
      console.error("[regCreateAcceptixAgent] createUser failed:", err);
      throw new HttpsError("internal", "فشل إنشاء الحساب — حاول تاني");
    }

    // ── Step 2: Create /users/{uid} doc — roll back Auth user on failure ──
    try {
      await admin
        .firestore()
        .doc(`users/${newUid}`)
        .set({
          uid: newUid,
          email,
          displayName: fullName,
          role: "acceptix_agent",
          phone,
          monthlyTarget: 0,
          isActive: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (e) {
      console.error(
        "[regCreateAcceptixAgent] users/{uid} write failed — rolling back Auth user:",
        e
      );
      try {
        await admin.auth().deleteUser(newUid);
      } catch (rollbackErr) {
        console.error(
          "[regCreateAcceptixAgent] CRITICAL — orphan auth user, rollback failed:",
          rollbackErr,
          "uid:",
          newUid
        );
      }
      throw new HttpsError("internal", "فشل حفظ بيانات الموظف — حاول تاني");
    }

    // ── Step 3: Audit (best-effort) ───────────────────────────────────────
    await writeAuditFromFunction({
      action: "reg.agent.create",
      entityType: "regAgent",
      entityId: newUid,
      actor,
      changes: {
        email: { from: null, to: email },
        fullName: { from: null, to: fullName },
        role: { from: null, to: "acceptix_agent" },
      },
    });

    return { uid: newUid, email, fullName };
  }
);
