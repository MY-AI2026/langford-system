/**
 * Cloud Functions for Academic-Organizer lifecycle (admin-only):
 *   - orgToggleOrganizerActive  — disable/enable an existing organizer
 *   - orgResetOrganizerPassword — set a new password for an existing organizer
 *
 * Mirrors the Acceptix-agent management functions: validates the caller is an
 * active admin and the target is an academic_organizer, and mirrors disabled
 * state onto both Auth and Firestore.
 */

import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { assertAdmin, writeAuditFromFunction } from "../registration/auth-helpers";

interface ToggleActiveInput {
  uid: string;
  isActive: boolean;
}

interface ResetPasswordInput {
  uid: string;
  password: string;
}

function validateStrongPassword(pw: string): string | null {
  if (typeof pw !== "string") return "Password must be a string.";
  if (pw.length < 12) return "Password must be at least 12 characters";
  if (!/[A-Z]/.test(pw)) return "Must include an uppercase letter (A-Z)";
  if (!/[a-z]/.test(pw)) return "Must include a lowercase letter (a-z)";
  if (!/\d/.test(pw)) return "Must include a digit (0-9)";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Must include a special character (!@#$...)";
  return null;
}

async function loadOrganizer(uid: string): Promise<{
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
  if (data.role !== "academic_organizer") {
    throw new HttpsError("failed-precondition", "Target is not an academic organizer.");
  }
  return { doc: docRef, data };
}

export const orgToggleOrganizerActive = onCall<ToggleActiveInput>(
  { region: "us-central1" },
  async (request: CallableRequest<ToggleActiveInput>) => {
    const actor = await assertAdmin(request);
    const { uid, isActive } = request.data ?? ({} as ToggleActiveInput);

    if (typeof isActive !== "boolean") {
      throw new HttpsError("invalid-argument", "isActive must be a boolean.");
    }

    const { doc, data } = await loadOrganizer(uid);
    const prev = data.isActive !== false;

    await admin.auth().updateUser(uid, { disabled: !isActive });
    await doc.update({
      isActive,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await writeAuditFromFunction({
      action: isActive ? "org.organizer.enable" : "org.organizer.disable",
      entityType: "academicOrganizer",
      entityId: uid,
      actor,
      changes: { isActive: { from: prev, to: isActive } },
    });

    return { uid, isActive };
  }
);

export const orgResetOrganizerPassword = onCall<ResetPasswordInput>(
  { region: "us-central1" },
  async (request: CallableRequest<ResetPasswordInput>) => {
    const actor = await assertAdmin(request);
    const { uid, password } = request.data ?? ({} as ResetPasswordInput);

    const pwErr = validateStrongPassword(password);
    if (pwErr) throw new HttpsError("invalid-argument", pwErr);

    await loadOrganizer(uid);
    await admin.auth().updateUser(uid, { password });

    await writeAuditFromFunction({
      action: "org.organizer.reset_password",
      entityType: "academicOrganizer",
      entityId: uid,
      actor,
    });

    return { uid, ok: true };
  }
);
