/**
 * Registration module — append-only audit log.
 *
 * Every write action against `regCourses`, `regStudents`, agents, or
 * notifications must call `writeRegAuditLog`. The Firestore rules layer
 * mirrors the application invariants (auditLog is immutable; userId must
 * match request.auth.uid), so a malicious client cannot fake an entry from
 * another user.
 */

import { restCreate } from "@/lib/firebase/rest-helpers";
import {
  RegAuditAction,
  RegAuditEntityType,
  UserRole,
} from "@/lib/types";

interface WriteRegAuditLogInput {
  action: RegAuditAction;
  entityType: RegAuditEntityType;
  entityId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

/**
 * Write a single audit row. Failure is logged but never thrown — the caller
 * has already performed the primary action and we don't want an audit-write
 * outage to surface as a user-facing error. (Audit gaps are visible to the
 * admin via the audit report and can be backfilled if required.)
 */
export async function writeRegAuditLog(input: WriteRegAuditLogInput): Promise<void> {
  try {
    const userAgent =
      typeof navigator !== "undefined" && typeof navigator.userAgent === "string"
        ? navigator.userAgent.slice(0, 256) // cap length for storage hygiene
        : null;

    await restCreate("regAuditLog", {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      userId: input.userId,
      userName: input.userName,
      userRole: input.userRole,
      changes: input.changes ?? {},
      userAgent,
      timestamp: new Date(),
    });
  } catch (e) {
    console.warn("[reg-audit] write failed (non-blocking):", e);
  }
}
