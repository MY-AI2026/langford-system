/**
 * Cloud Function: orgCreateAcademicOrganizer
 *
 * Admin creates a new Academic-Organizer account. Same atomic flow as the
 * Acceptix-agent creation:
 *   1. Validate caller is an active admin.
 *   2. Validate input (email, strong password, full name).
 *   3. Create Firebase Auth user.
 *   4. Create matching /users/{uid} doc with role = academic_organizer.
 *   5. Write an audit entry.
 * Rolls back the Auth user if the Firestore write fails (no orphan logins).
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { assertAdmin, writeAuditFromFunction } from "../registration/auth-helpers";

interface CreateOrganizerInput {
  fullName: string;
  email: string;
  phone?: string;
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

function validateEmail(email: string): string | null {
  if (typeof email !== "string") return "Email must be a string.";
  const trimmed = email.trim();
  if (trimmed.length === 0) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Invalid email";
  return null;
}

export const orgCreateAcademicOrganizer = onCall<CreateOrganizerInput>(
  { region: "us-central1", enforceAppCheck: false },
  async (request) => {
    const actor = await assertAdmin(request);

    const input = request.data ?? ({} as CreateOrganizerInput);
    const fullName = (input.fullName ?? "").trim();
    const email = (input.email ?? "").trim().toLowerCase();
    const phone = (input.phone ?? "").trim();
    const password = input.password ?? "";

    if (fullName.length < 2) {
      throw new HttpsError("invalid-argument", "Name must be at least 2 characters");
    }
    const emailErr = validateEmail(email);
    if (emailErr) throw new HttpsError("invalid-argument", emailErr);
    const pwErr = validateStrongPassword(password);
    if (pwErr) throw new HttpsError("invalid-argument", pwErr);

    try {
      await admin.auth().getUserByEmail(email);
      throw new HttpsError("already-exists", "Email is already in use");
    } catch (e) {
      const err = e as { code?: string };
      if (err.code !== "auth/user-not-found") {
        if (err.code === undefined) throw e;
      }
    }

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
      const err = e as { code?: string };
      if (err.code === "auth/email-already-exists") {
        throw new HttpsError("already-exists", "Email is already in use");
      }
      console.error("[orgCreateAcademicOrganizer] createUser failed:", err);
      throw new HttpsError("internal", "Account creation failed — try again");
    }

    try {
      await admin
        .firestore()
        .doc(`users/${newUid}`)
        .set({
          uid: newUid,
          email,
          displayName: fullName,
          role: "academic_organizer",
          phone,
          monthlyTarget: 0,
          isActive: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (e) {
      console.error(
        "[orgCreateAcademicOrganizer] users/{uid} write failed — rolling back:",
        e
      );
      try {
        await admin.auth().deleteUser(newUid);
      } catch (rollbackErr) {
        console.error(
          "[orgCreateAcademicOrganizer] CRITICAL — orphan auth user, rollback failed:",
          rollbackErr,
          "uid:",
          newUid
        );
      }
      throw new HttpsError("internal", "Failed to save organizer data — try again");
    }

    await writeAuditFromFunction({
      action: "org.organizer.create",
      entityType: "academicOrganizer",
      entityId: newUid,
      actor,
      changes: {
        email: { from: null, to: email },
        fullName: { from: null, to: fullName },
        role: { from: null, to: "academic_organizer" },
      },
    });

    return { uid: newUid, email, fullName };
  }
);
