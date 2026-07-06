/**
 * Shared "needs follow-up" logic.
 *
 * A student is due for follow-up when it's an active lead that has gone stale —
 * i.e. not touched within a status-dependent threshold. Both the dashboard
 * reminders widget and the sidebar badge derive from this single source so the
 * two never disagree.
 *
 * Deliberately computed from the already-loaded `students` collection (a single
 * indexed query) instead of a collection-group query over `activityLog`, which
 * would need a composite index the project intentionally avoids.
 */

import { Student, StudentStatus } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toDateSafe(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "object" && typeof value.toDate === "function") {
    try {
      const d = value.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Days of inactivity after which a student of this status needs a nudge. */
export function followUpThresholdDays(status: StudentStatus): number {
  return status === "lead" || status === "contacted" ? 3 : 7;
}

/** True when an active student has gone stale past its threshold. */
export function isStudentDueForFollowUp(s: Student, now: Date = new Date()): boolean {
  if (s.isArchived || s.status === "paid" || s.status === "lost") return false;
  const updated = toDateSafe(s.updatedAt);
  if (!updated) return false;
  const days = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
  return days >= followUpThresholdDays(s.status);
}

/** Count of students currently needing follow-up. */
export function countStudentsDueForFollowUp(students: Student[], now: Date = new Date()): number {
  return students.reduce((n, s) => (isStudentDueForFollowUp(s, now) ? n + 1 : n), 0);
}
