/**
 * Registration module — course catalogue (admin-managed).
 *
 * Read-side: agents and admins both list active courses for the
 * register-student dropdown. Write-side: admin only — enforced by Firestore
 * rules; the service layer just mirrors the intent in code.
 */

import {
  RegCourse,
  RegCourseCategory,
  UserRole,
} from "@/lib/types";
import {
  restCreate,
  restUpdate,
  fetchDoc,
  runQuery,
  createSubscription,
} from "@/lib/firebase/rest-helpers";
import { REG_DEFAULT_CURRENCY } from "@/lib/registration/constants";
import { writeRegAuditLog } from "./reg-audit-service";

const COLLECTION = "regCourses";

// ─── Read API ────────────────────────────────────────────────────────────────

/** Live list of all courses (admin view — includes inactive). */
export function subscribeToCourses(
  callback: (courses: RegCourse[]) => void
): () => void {
  const structuredQuery = {
    from: [{ collectionId: COLLECTION }],
    orderBy: [
      { field: { fieldPath: "category" }, direction: "ASCENDING" },
      { field: { fieldPath: "name" }, direction: "ASCENDING" },
    ],
  };

  return createSubscription<RegCourse>(
    async () => {
      try {
        return (await runQuery(structuredQuery)) as RegCourse[];
      } catch (e) {
        console.error("[reg-course] subscribeToCourses failed:", e);
        return [];
      }
    },
    callback,
    10000
  );
}

/** Active courses only — used in the agent registration dropdown. */
export function subscribeToActiveCourses(
  callback: (courses: RegCourse[]) => void
): () => void {
  const structuredQuery = {
    from: [{ collectionId: COLLECTION }],
    where: {
      fieldFilter: {
        field: { fieldPath: "isActive" },
        op: "EQUAL",
        value: { booleanValue: true },
      },
    },
    orderBy: [
      { field: { fieldPath: "category" }, direction: "ASCENDING" },
      { field: { fieldPath: "name" }, direction: "ASCENDING" },
    ],
  };

  return createSubscription<RegCourse>(
    async () => {
      try {
        return (await runQuery(structuredQuery)) as RegCourse[];
      } catch (e) {
        console.error("[reg-course] subscribeToActiveCourses failed:", e);
        return [];
      }
    },
    callback,
    10000
  );
}

export async function getCourse(courseId: string): Promise<RegCourse | null> {
  const doc = await fetchDoc(`${COLLECTION}/${courseId}`);
  return doc as RegCourse | null;
}

// ─── Write API (admin only) ──────────────────────────────────────────────────

interface CreateCourseInput {
  name: string;
  category: RegCourseCategory;
  description?: string;
  fee: number;
  currency?: string;
  durationHours?: number | null;
  durationLabel?: string;
  isExclusiveAcceptix?: boolean;
  isActive?: boolean;
}

export async function createCourse(
  input: CreateCourseInput,
  actor: { uid: string; displayName: string; role: UserRole }
): Promise<string> {
  const now = new Date();
  const docData: Record<string, unknown> = {
    name: input.name,
    category: input.category,
    description: input.description ?? "",
    fee: input.fee,
    currency: input.currency ?? REG_DEFAULT_CURRENCY,
    durationHours: input.durationHours ?? null,
    durationLabel: input.durationLabel ?? "",
    isExclusiveAcceptix: input.isExclusiveAcceptix ?? false,
    isActive: input.isActive ?? true,
    createdBy: actor.uid,
    createdByName: actor.displayName,
    createdAt: now,
    updatedAt: now,
  };

  const newId = await restCreate(COLLECTION, docData);

  await writeRegAuditLog({
    action: "reg.course.create",
    entityType: "regCourse",
    entityId: newId,
    userId: actor.uid,
    userName: actor.displayName,
    userRole: actor.role,
    changes: {
      name: { from: null, to: input.name },
      fee: { from: null, to: input.fee },
    },
  });

  return newId;
}

interface UpdateCourseInput {
  name?: string;
  category?: RegCourseCategory;
  description?: string;
  fee?: number;
  currency?: string;
  durationHours?: number | null;
  durationLabel?: string;
  isExclusiveAcceptix?: boolean;
  isActive?: boolean;
}

export async function updateCourse(
  courseId: string,
  input: UpdateCourseInput,
  actor: { uid: string; displayName: string; role: UserRole },
  changes: Record<string, { from: unknown; to: unknown }> = {}
): Promise<void> {
  await restUpdate(`${COLLECTION}/${courseId}`, {
    ...input,
    updatedAt: new Date(),
  });

  await writeRegAuditLog({
    action: "reg.course.update",
    entityType: "regCourse",
    entityId: courseId,
    userId: actor.uid,
    userName: actor.displayName,
    userRole: actor.role,
    changes,
  });
}

/** Soft-toggle visibility (no hard delete — preserves historical reports). */
export async function toggleCourseActive(
  courseId: string,
  isActive: boolean,
  actor: { uid: string; displayName: string; role: UserRole }
): Promise<void> {
  await updateCourse(
    courseId,
    { isActive },
    actor,
    { isActive: { from: !isActive, to: isActive } }
  );
}
