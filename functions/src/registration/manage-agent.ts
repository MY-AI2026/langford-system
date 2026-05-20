/**
 * Cloud Functions for agent lifecycle management (admin-only):
 *   - regToggleAgentActive  — disable/enable an existing Acceptix agent
 *   - regResetAgentPassword — set a new password for an existing agent
 *
 * Both validate the caller is an active admin and the target is an
 * Acceptix agent. Disabling sets `isActive: false` on the Firestore doc
 * AND `disabled: true` on the Firebase Auth user so the agent can't sign
 * in even if their session token is still valid.
 */

import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { assertAdmin, writeAuditFromFunction } from "./auth-helpers";

interface ToggleActiveInput {
  uid: string;
  isActive: boolean;
}

interface ResetPasswordInput {
  uid: string;
  password: string;
}

// Same strong-password rule as create-agent — duplicated rather than
// shared to keep the validation visible in each function file.
function validateStrongPassword(pw: string): string | null {
  if (typeof pw !== "string") return "Password must be a string.";
  if (pw.length < 12) return "Password must be at least 12 characters";
  if (!/[A-Z]/.test(pw)) return "Must include an uppercase letter (A-Z)";
  if (!/[a-z]/.test(pw)) return "Must include a lowercase letter (a-z)";
  if (!/\d/.test(pw)) return "Must include a digit (0-9)";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Must include a special character (!@#$...)";
  return null;
}

async function loadAgent(uid: string): Promise<{
  doc: FirebaseFirestore.DocumentReference;
  data: FirebaseFirestore.DocumentData;
}> {
  if (!uid || typeof uid !== "string") {
    throw new HttpsError("invalid-argument", "Missing target uid.");
  }
  const docRef = admin.firestore().doc(`users/${uid}`);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Target user not found.");
  }
  const data = snap.data() ?? {};
  if (data.role !== "acceptix_agent") {
    throw new HttpsError(
      "failed-precondition",
      "Target is not an Acceptix agent."
    );
  }
  return { doc: docRef, data };
}

export const regToggleAgentActive = onCall<ToggleActiveInput>(
  { region: "us-central1" },
  async (request: CallableRequest<ToggleActiveInput>) => {
    const actor = await assertAdmin(request);
    const { uid, isActive } = request.data ?? ({} as ToggleActiveInput);

    if (typeof isActive !== "boolean") {
      throw new HttpsError("invalid-argument", "isActive must be a boolean.");
    }

    const { doc, data } = await loadAgent(uid);
    const prev = data.isActive !== false;

    // Mirror the state on both Auth and Firestore so a disabled agent
    // can't sign in OR be read as active from any other surface.
    await admin.auth().updateUser(uid, { disabled: !isActive });
    await doc.update({
      isActive,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await writeAuditFromFunction({
      action: isActive ? "reg.agent.enable" : "reg.agent.disable",
      entityType: "regAgent",
      entityId: uid,
      actor,
      changes: {
        isActive: { from: prev, to: isActive },
      },
    });

    return { uid, isActive };
  }
);

export const regResetAgentPassword = onCall<ResetPasswordInput>(
  { region: "us-central1" },
  async (request: CallableRequest<ResetPasswordInput>) => {
    const actor = await assertAdmin(request);
    const { uid, password } = request.data ?? ({} as ResetPasswordInput);

    const pwErr = validateStrongPassword(password);
    if (pwErr) throw new HttpsError("invalid-argument", pwErr);

    // Confirm the target is an Acceptix agent before resetting.
    await loadAgent(uid);

    await admin.auth().updateUser(uid, { password });

    await writeAuditFromFunction({
      action: "reg.agent.reset_password",
      entityType: "regAgent",
      entityId: uid,
      actor,
      // Never log the actual password (even hashed) — the action itself is
      // the audit record, and only the actor + timestamp matter.
    });

    return { uid, ok: true };
  }
);
