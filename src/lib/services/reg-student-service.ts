/**
 * Registration module — student records.
 *
 * Security model:
 *   - Each agent owns ONLY the rows where `createdBy == their uid`.
 *   - Firestore rules enforce this at read AND write time (see firestore.rules).
 *   - The service layer mirrors the same filters for performance and defense-in-depth.
 *
 * Data model invariants (all locked at create time):
 *   - `source` defaults to "Acceptix" (extensible from the admin UI).
 *   - `courseFee`, `currency`, `commissionRate`, `commissionAmount` are
 *     SNAPSHOTTED — never derived from the live course at report time, so
 *     historical reports remain immutable when course pricing changes.
 *   - `isDeleted` defaults to false; hard delete is disabled at the rules layer.
 */

import {
  RegStudent,
  RegStudentStatus,
  RegCourse,
  UserRole,
} from "@/lib/types";
import {
  restCreate,
  restUpdate,
  fetchDoc,
  runQuery,
  createSubscription,
} from "@/lib/firebase/rest-helpers";
import { normalizePhone } from "@/lib/utils/phone";
import { fuzzyMatchAny } from "@/lib/utils/search";
import {
  ACCEPTIX_COMMISSION_RATE,
  REG_DEFAULT_CURRENCY,
  REG_DEFAULT_SOURCE,
  computeCommission,
} from "@/lib/registration/constants";
import { writeRegAuditLog } from "./reg-audit-service";
import { emitNewStudentNotification } from "./reg-notification-service";
import { getCourse } from "./reg-course-service";

const COLLECTION = "regStudents";

// ─── Read API ────────────────────────────────────────────────────────────────

interface ListFilters {
  status?: RegStudentStatus | "all";
  courseId?: string | "all";
  searchQuery?: string;
  includeDeleted?: boolean;
}

/**
 * Agent view: only their own students.
 * Backend-enforced via the `createdBy` clause (matches the Firestore rule).
 */
export function subscribeToMyStudents(
  agentUid: string,
  filters: ListFilters,
  callback: (students: RegStudent[]) => void
): () => void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereFilters: any[] = [
    {
      fieldFilter: {
        field: { fieldPath: "createdBy" },
        op: "EQUAL",
        value: { stringValue: agentUid },
      },
    },
    {
      fieldFilter: {
        field: { fieldPath: "isDeleted" },
        op: "EQUAL",
        value: { booleanValue: filters.includeDeleted === true },
      },
    },
  ];

  const structuredQuery = {
    from: [{ collectionId: COLLECTION }],
    where: { compositeFilter: { op: "AND", filters: whereFilters } },
    orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
  };

  return createSubscription<RegStudent>(
    async () => {
      try {
        let rows = (await runQuery(structuredQuery)) as RegStudent[];
        rows = applyClientFilters(rows, filters);
        return rows;
      } catch (e) {
        console.error("[reg-student] subscribeToMyStudents failed:", e);
        return [];
      }
    },
    callback,
    10000
  );
}

/**
 * Admin view: all students across all agents.
 */
export function subscribeToAllStudents(
  filters: ListFilters & { agentUid?: string | "all" },
  callback: (students: RegStudent[]) => void
): () => void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereFilters: any[] = [
    {
      fieldFilter: {
        field: { fieldPath: "isDeleted" },
        op: "EQUAL",
        value: { booleanValue: filters.includeDeleted === true },
      },
    },
  ];

  // Optional server-side agent filter (admin filtering by a specific agent).
  if (filters.agentUid && filters.agentUid !== "all") {
    whereFilters.push({
      fieldFilter: {
        field: { fieldPath: "createdBy" },
        op: "EQUAL",
        value: { stringValue: filters.agentUid },
      },
    });
  }

  const structuredQuery = {
    from: [{ collectionId: COLLECTION }],
    where:
      whereFilters.length === 1
        ? whereFilters[0]
        : { compositeFilter: { op: "AND", filters: whereFilters } },
    orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
  };

  return createSubscription<RegStudent>(
    async () => {
      try {
        let rows = (await runQuery(structuredQuery)) as RegStudent[];
        rows = applyClientFilters(rows, filters);
        return rows;
      } catch (e) {
        console.error("[reg-student] subscribeToAllStudents failed:", e);
        return [];
      }
    },
    callback,
    10000
  );
}

function applyClientFilters(rows: RegStudent[], filters: ListFilters): RegStudent[] {
  let out = rows;

  if (filters.status && filters.status !== "all") {
    out = out.filter((r) => r.status === filters.status);
  }
  if (filters.courseId && filters.courseId !== "all") {
    out = out.filter((r) => r.courseId === filters.courseId);
  }
  if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
    out = out.filter((r) =>
      fuzzyMatchAny(
        [r.fullName, r.phone, r.email ?? "", r.courseName, r.createdByName],
        filters.searchQuery!
      )
    );
  }
  return out;
}

export async function getStudent(studentId: string): Promise<RegStudent | null> {
  const doc = await fetchDoc(`${COLLECTION}/${studentId}`);
  return doc as RegStudent | null;
}

// ─── Write API ───────────────────────────────────────────────────────────────

interface CreateStudentInput {
  fullName: string;
  phone: string;
  email?: string;
  courseId: string;
  notes?: string;
  /** Optional client-side idempotency key — dedupes accidental double-submits. */
  idempotencyKey?: string;
}

/**
 * Create a registration record. Snapshots course fee + commission rate so
 * downstream reports stay accurate even if the course is repriced.
 *
 * Throws:
 *   - "COURSE_NOT_FOUND"     — referenced course missing
 *   - "COURSE_INACTIVE"      — course exists but is disabled
 *   - "PHONE_INVALID"        — fewer than 7 digits after normalization
 *   - "DUPLICATE_REQUEST"    — same idempotencyKey already used (rare double-submit)
 */
export async function createStudent(
  input: CreateStudentInput,
  actor: { uid: string; displayName: string; role: UserRole }
): Promise<string> {
  // ── Validate phone ────────────────────────────────────────────────────────
  const normalizedPhone = normalizePhone(input.phone);
  if (!normalizedPhone || normalizedPhone.length < 7) {
    throw new Error("PHONE_INVALID");
  }

  // ── Idempotency check (best-effort: dedupe within the agent's history) ───
  if (input.idempotencyKey) {
    const dup = await findByIdempotencyKey(actor.uid, input.idempotencyKey);
    if (dup) {
      return dup.id; // returns the prior id silently — caller sees success either way
    }
  }

  // ── Phone uniqueness (across all agents) — blocks double-referral / double
  //    commission for the same person.
  if (await phoneAlreadyRegistered(normalizedPhone)) {
    throw new Error("PHONE_DUPLICATE");
  }

  // ── Load course + snapshot pricing ────────────────────────────────────────
  const course = await getCourse(input.courseId);
  if (!course) throw new Error("COURSE_NOT_FOUND");
  if (!course.isActive) throw new Error("COURSE_INACTIVE");

  const courseFee = typeof course.fee === "number" ? course.fee : 0;
  const currency = course.currency || REG_DEFAULT_CURRENCY;
  const commissionRate = ACCEPTIX_COMMISSION_RATE;
  const commissionAmount = computeCommission(courseFee, commissionRate);

  // ── Build document — every field is explicit; no nullish surprises ────────
  const now = new Date();
  const docData: Record<string, unknown> = {
    // Identity
    fullName: input.fullName.trim(),
    phone: normalizedPhone,
    email: input.email && input.email.trim().length > 0 ? input.email.trim() : null,

    // Course snapshot
    courseId: course.id,
    courseName: course.name,
    courseCategory: course.category,
    courseFee,
    currency,

    // Commission snapshot
    commissionRate,
    commissionAmount,

    // Source + creator
    source: REG_DEFAULT_SOURCE,
    createdBy: actor.uid,
    createdByName: actor.displayName,
    createdByRole: actor.role,

    // Workflow
    status: "new" satisfies RegStudentStatus,
    notes: input.notes?.trim() ?? "",

    // Soft delete (locked off)
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,

    // Timestamps
    createdAt: now,
    updatedAt: now,
  };

  if (input.idempotencyKey) {
    docData.idempotencyKey = input.idempotencyKey;
  }

  const newId = await restCreate(COLLECTION, docData);

  // ── Side effects: audit log + admin notification (both best-effort) ──────
  await writeRegAuditLog({
    action: "reg.student.create",
    entityType: "regStudent",
    entityId: newId,
    userId: actor.uid,
    userName: actor.displayName,
    userRole: actor.role,
    changes: {
      fullName: { from: null, to: docData.fullName },
      courseName: { from: null, to: course.name },
      courseFee: { from: null, to: courseFee },
      commissionAmount: { from: null, to: commissionAmount },
    },
  });

  // Build the in-memory record once for the notification payload — avoids a
  // round-trip back to Firestore to read what we just wrote.
  const justCreated = {
    id: newId,
    ...docData,
  } as unknown as RegStudent;

  await emitNewStudentNotification(justCreated);

  return newId;
}

/**
 * Look up a prior submission with the same idempotency key under the same
 * agent. Returns null if none — service then proceeds to create.
 */
/**
 * Returns true if an active (non-deleted) Acceptix student already exists with
 * this normalized phone — across ALL agents. Prevents the same person being
 * referred twice (which would pay the 10% commission twice). Queries by phone
 * (single-field, auto-indexed) and filters isDeleted client-side.
 */
async function phoneAlreadyRegistered(
  normalizedPhone: string
): Promise<boolean> {
  try {
    const rows = (await runQuery({
      from: [{ collectionId: COLLECTION }],
      where: {
        fieldFilter: {
          field: { fieldPath: "phone" },
          op: "EQUAL",
          value: { stringValue: normalizedPhone },
        },
      },
    })) as RegStudent[];
    return rows.some((r) => !r.isDeleted);
  } catch {
    // On query failure, don't block registration (fail open) — the admin can
    // still catch duplicates in reports.
    return false;
  }
}

async function findByIdempotencyKey(
  agentUid: string,
  idempotencyKey: string
): Promise<RegStudent | null> {
  try {
    const results = (await runQuery({
      from: [{ collectionId: COLLECTION }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: "createdBy" },
                op: "EQUAL",
                value: { stringValue: agentUid },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: "idempotencyKey" },
                op: "EQUAL",
                value: { stringValue: idempotencyKey },
              },
            },
          ],
        },
      },
      limit: 1,
    })) as RegStudent[];
    return results.length > 0 ? results[0] : null;
  } catch (e) {
    console.warn("[reg-student] idempotency check failed (proceeding):", e);
    return null;
  }
}

interface UpdateStudentInput {
  status?: RegStudentStatus;
  notes?: string;
}

/** Admin-only update — Firestore rules enforce that identity fields stay frozen. */
export async function updateStudent(
  studentId: string,
  input: UpdateStudentInput,
  actor: { uid: string; displayName: string; role: UserRole },
  changes: Record<string, { from: unknown; to: unknown }> = {}
): Promise<void> {
  await restUpdate(`${COLLECTION}/${studentId}`, {
    ...input,
    updatedAt: new Date(),
  });

  await writeRegAuditLog({
    action: "reg.student.update",
    entityType: "regStudent",
    entityId: studentId,
    userId: actor.uid,
    userName: actor.displayName,
    userRole: actor.role,
    changes,
  });
}

/** Soft delete — sets the flag, audit-logs the action; reversible by `restoreStudent`. */
export async function softDeleteStudent(
  studentId: string,
  actor: { uid: string; displayName: string; role: UserRole }
): Promise<void> {
  await restUpdate(`${COLLECTION}/${studentId}`, {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy: actor.uid,
    updatedAt: new Date(),
  });

  await writeRegAuditLog({
    action: "reg.student.delete",
    entityType: "regStudent",
    entityId: studentId,
    userId: actor.uid,
    userName: actor.displayName,
    userRole: actor.role,
  });
}

export async function restoreStudent(
  studentId: string,
  actor: { uid: string; displayName: string; role: UserRole }
): Promise<void> {
  await restUpdate(`${COLLECTION}/${studentId}`, {
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    updatedAt: new Date(),
  });

  await writeRegAuditLog({
    action: "reg.student.restore",
    entityType: "regStudent",
    entityId: studentId,
    userId: actor.uid,
    userName: actor.displayName,
    userRole: actor.role,
  });
}

/** Convenience: count how many active (non-deleted) records an agent owns. */
export async function countStudentsByAgent(agentUid: string): Promise<number> {
  try {
    const rows = (await runQuery({
      from: [{ collectionId: COLLECTION }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: "createdBy" },
                op: "EQUAL",
                value: { stringValue: agentUid },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: "isDeleted" },
                op: "EQUAL",
                value: { booleanValue: false },
              },
            },
          ],
        },
      },
    })) as RegStudent[];
    return rows.length;
  } catch (e) {
    console.warn("[reg-student] countStudentsByAgent failed:", e);
    return 0;
  }
}

/**
 * Re-export the snapshot helper so PR #3 reports can compute commissions
 * for legacy rows missing `commissionAmount` (defense — older test data
 * shouldn't crash a report).
 */
export { computeCommission } from "@/lib/registration/constants";

/** Convenience: pluck the snapshotted commission, falling back to a recompute. */
export function commissionFor(student: RegStudent): number {
  if (typeof student.commissionAmount === "number") return student.commissionAmount;
  const rate = student.commissionRate ?? ACCEPTIX_COMMISSION_RATE;
  return computeCommission(student.courseFee ?? 0, rate);
}

/** Re-exported here to keep registration-related course lookups close. */
export type { RegCourse };
