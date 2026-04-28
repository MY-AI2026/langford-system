import { Enrollment, CourseCategory, EnrollmentStatus } from "@/lib/types";
import { writeAuditLog } from "./audit-service";
import { runQuery, createSubscription, getToken, BASE } from "@/lib/firebase/rest-helpers";

// ─── Public API ──────────────────────────────────────────────────────────────

/** REST-based polling subscription */
export function subscribeToEnrollments(
  studentId: string,
  callback: (enrollments: Enrollment[]) => void
): () => void {
  const structuredQuery = {
    from: [{ collectionId: "enrollments" }],
    orderBy: [
      { field: { fieldPath: "createdAt" }, direction: "DESCENDING" },
    ],
  };

  return createSubscription<Enrollment>(
    async () => {
      return (await runQuery(
        structuredQuery,
        `students/${studentId}`
      )) as Enrollment[];
    },
    callback
  );
}

/** Create enrollment using REST API (not SDK — SDK writes are unreliable on Vercel) */
export async function createEnrollment(
  studentId: string,
  data: {
    courseId: string;
    courseName: string;
    courseCategory: CourseCategory;
    level?: string;
    startDate: Date;
    endDate?: Date | null;
    fees: number;
    instructorId?: string;
    instructorName?: string;
    notes?: string;
  },
  userId: string,
  userName: string
): Promise<string> {
  const token = await getToken();
  const url = `${BASE}/students/${studentId}/enrollments`;

  const now = new Date().toISOString();
  const startDateISO = data.startDate.toISOString();
  const endDateField = data.endDate
    ? { timestampValue: data.endDate.toISOString() }
    : { nullValue: "NULL_VALUE" };

  const fields: Record<string, unknown> = {
    studentId: { stringValue: studentId },
    courseId: { stringValue: data.courseId },
    courseName: { stringValue: data.courseName },
    courseCategory: { stringValue: data.courseCategory },
    level: { stringValue: data.level || "" },
    startDate: { timestampValue: startDateISO },
    endDate: endDateField,
    status: { stringValue: "active" },
    fees: { doubleValue: data.fees },
    amountPaid: { doubleValue: 0 },
    remainingBalance: { doubleValue: data.fees },
    instructorId: { stringValue: data.instructorId || "" },
    instructorName: { stringValue: data.instructorName || "" },
    notes: { stringValue: data.notes || "" },
    completionCertificateGenerated: { booleanValue: false },
    createdBy: { stringValue: userId },
    createdAt: { timestampValue: now },
    updatedAt: { timestampValue: now },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[enrollment-service] createEnrollment REST error:", err);
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ?? "Failed to create enrollment"
    );
  }

  const result = await res.json();
  const enrollmentId = result.name?.split("/").pop() || "";

  // Activity log (also REST — known to work)
  try {
    const { addActivityLogEntry } = await import("./student-service");
    await addActivityLogEntry(studentId, {
      type: "enrollment",
      description: `Enrolled in ${data.courseName}`,
      createdBy: userId,
      createdByName: userName,
      followUpDate: null,
    });
  } catch (e) {
    console.error("[enrollment-service] activity log error:", e);
  }

  // Audit log (non-blocking)
  try {
    await writeAuditLog({
      action: "create",
      entityType: "enrollment",
      entityId: enrollmentId,
      userId,
      userName,
      changes: {
        courseName: { from: null, to: data.courseName },
        status: { from: null, to: "active" },
      },
    });
  } catch (e) {
    console.error("[enrollment-service] audit log error:", e);
  }

  return enrollmentId;
}

/** Update enrollment using REST API */
export async function updateEnrollment(
  studentId: string,
  enrollmentId: string,
  data: Record<string, unknown>
): Promise<void> {
  const token = await getToken();
  const url = `${BASE}/students/${studentId}/enrollments/${enrollmentId}`;

  // Build fields in Firestore format
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") fields[key] = { stringValue: value };
    else if (typeof value === "number") fields[key] = { doubleValue: value };
    else if (typeof value === "boolean") fields[key] = { booleanValue: value };
    else if (value === null) fields[key] = { nullValue: "NULL_VALUE" };
    else if (value instanceof Date) fields[key] = { timestampValue: value.toISOString() };
  }
  fields.updatedAt = { timestampValue: new Date().toISOString() };

  const fieldPaths = Object.keys(fields).join(",");

  const res = await fetch(`${url}?updateMask.fieldPaths=${fieldPaths}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[enrollment-service] updateEnrollment REST error:", err);
    throw new Error("Failed to update enrollment");
  }
}

/** Delete (remove) enrollment using REST API — admin only */
export async function deleteEnrollment(
  studentId: string,
  enrollmentId: string,
  courseName: string,
  userId: string,
  userName: string
): Promise<void> {
  const token = await getToken();
  const url = `${BASE}/students/${studentId}/enrollments/${enrollmentId}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[enrollment-service] deleteEnrollment REST error:", err);
    throw new Error("Failed to delete enrollment");
  }

  // Activity log (non-blocking)
  try {
    const { addActivityLogEntry } = await import("./student-service");
    await addActivityLogEntry(studentId, {
      type: "enrollment",
      description: `Removed from ${courseName}`,
      createdBy: userId,
      createdByName: userName,
      followUpDate: null,
    });
  } catch (e) {
    console.error("[enrollment-service] activity log error:", e);
  }

  // Audit log (non-blocking)
  try {
    await writeAuditLog({
      action: "delete",
      entityType: "enrollment",
      entityId: enrollmentId,
      userId,
      userName,
      changes: {
        courseName: { from: courseName, to: null },
        status: { from: "deleted", to: null },
      },
    });
  } catch (e) {
    console.error("[enrollment-service] audit log error:", e);
  }
}

/** Complete enrollment using REST API */
export async function completeEnrollment(
  studentId: string,
  enrollmentId: string,
  userId: string,
  userName: string
): Promise<void> {
  await updateEnrollment(studentId, enrollmentId, {
    status: "completed",
    endDate: new Date(),
  });

  // Activity log (non-blocking)
  try {
    const { addActivityLogEntry } = await import("./student-service");
    await addActivityLogEntry(studentId, {
      type: "enrollment",
      description: "Completed course enrollment",
      createdBy: userId,
      createdByName: userName,
      followUpDate: null,
    });
  } catch (e) {
    console.error("[enrollment-service] activity log error:", e);
  }

  // Audit log (non-blocking)
  try {
    await writeAuditLog({
      action: "update",
      entityType: "enrollment",
      entityId: enrollmentId,
      userId,
      userName,
      changes: { status: { from: "active", to: "completed" } },
    });
  } catch (e) {
    console.error("[enrollment-service] audit log error:", e);
  }
}
