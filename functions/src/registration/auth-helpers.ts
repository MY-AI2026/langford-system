/**
 * Shared auth-side helpers for the registration-module Cloud Functions.
 *
 * Every callable in this module must call `assertAdmin(request)` BEFORE
 * touching Firestore or Firebase Auth — that's the only thing standing
 * between the public callable endpoint and an attacker with any signed-in
 * Firebase user. The Firestore security rules give us the same guarantee
 * for direct DB writes, but callables run with full admin SDK power, so
 * the role check has to live inside the function.
 */

import { HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export interface AdminContext {
  uid: string;
  displayName: string;
  email: string;
}

/**
 * Throws `HttpsError` if the caller is not an active admin. Returns a
 * minimal AdminContext on success so callers don't have to re-read
 * `users/{uid}` themselves.
 */
export async function assertAdmin(
  request: CallableRequest<unknown>
): Promise<AdminContext> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const uid = request.auth.uid;
  const snap = await admin.firestore().doc(`users/${uid}`).get();
  if (!snap.exists) {
    throw new HttpsError("permission-denied", "User record not found.");
  }
  const data = snap.data() ?? {};
  if (data.isActive === false) {
    throw new HttpsError("permission-denied", "Account is disabled.");
  }
  if (data.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin role required.");
  }
  return {
    uid,
    displayName: (data.displayName as string) ?? "",
    email: (data.email as string) ?? request.auth.token.email ?? "",
  };
}

/**
 * Append an immutable audit log entry under `regAuditLog/{auto-id}`.
 * Best-effort — failure is logged but not thrown, mirroring the
 * non-blocking behaviour of the client-side audit helper.
 */
export async function writeAuditFromFunction(input: {
  action: string;
  entityType: string;
  entityId: string;
  actor: AdminContext;
  changes?: Record<string, { from: unknown; to: unknown }>;
}): Promise<void> {
  try {
    await admin.firestore().collection("regAuditLog").add({
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      userId: input.actor.uid,
      userName: input.actor.displayName,
      userRole: "admin",
      changes: input.changes ?? {},
      userAgent: "cloud-function",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.warn("[reg-audit] write failed (non-blocking):", e);
  }
}
