import { auth } from "@/lib/firebase/config";
import { Student, StudentStatus, UserRole, ActivityLogEntry } from "@/lib/types";
import { writeAuditLog } from "./audit-service";
import {
  getToken as restGetToken,
  fetchDoc,
  runQuery,
  createSubscription,
  BASE,
  restCreate,
  restUpdate,
  restDelete,
} from "@/lib/firebase/rest-helpers";

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;

async function getToken(): Promise<string | null> {
  try {
    return auth.currentUser ? await auth.currentUser.getIdToken() : null;
  } catch { return null; }
}

// ─── REST write for activity log (more reliable than SDK addDoc on Vercel) ───

/** Write an activity log entry via REST API */
export async function addActivityLogEntry(
  studentId: string,
  data: {
    type: string;
    description: string;
    createdBy: string;
    createdByName: string;
    followUpDate: Date | null;
    previousValue?: string;
    newValue?: string;
  }
): Promise<void> {
  const token = await getToken();
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/students/${studentId}/activityLog`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const fields: Record<string, unknown> = {
    type: { stringValue: data.type },
    description: { stringValue: data.description },
    createdBy: { stringValue: data.createdBy },
    createdByName: { stringValue: data.createdByName },
    createdAt: { timestampValue: new Date().toISOString() },
    isFollowUpDone: { booleanValue: false },
    followUpDate: data.followUpDate
      ? { timestampValue: data.followUpDate.toISOString() }
      : { nullValue: "NULL_VALUE" },
  };
  if (data.previousValue !== undefined) fields.previousValue = { stringValue: data.previousValue };
  if (data.newValue !== undefined) fields.newValue = { stringValue: data.newValue };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ fields }),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ?? "Failed to save note"
    );
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** REST-based polling subscription (replaces onSnapshot) */
export function subscribeToStudents(
  filters: {
    role: UserRole;
    userId: string;
    status?: StudentStatus;
    showArchived?: boolean;
    searchQuery?: string;
  },
  callback: (students: Student[]) => void
): () => void {
  // SIMPLIFIED QUERY - Avoid composite index requirement by doing filtering client-side
  // Only query by isArchived to minimize index dependencies
  const structuredQuery = {
    from: [{ collectionId: "students" }],
    where: {
      fieldFilter: {
        field: { fieldPath: "isArchived" },
        op: "EQUAL",
        value: { booleanValue: filters.showArchived === true },
      },
    },
    // Remove orderBy to avoid composite index requirement
    // We'll sort client-side instead
  };

  return createSubscription<Student>(
    async () => {
      try {
        let students = (await runQuery(structuredQuery)) as Student[];

        // Apply role-based filtering client-side
        if (filters.role === "sales") {
          students = students.filter((s) => s.assignedSalesRepId === filters.userId);
        }

        // Apply status filter client-side
        if (filters.status) {
          students = students.filter((s) => s.status === filters.status);
        }

        // Apply search filter client-side
        if (filters.searchQuery) {
          const search = filters.searchQuery.toLowerCase();
          students = students.filter(
            (s) =>
              s.fullName?.toLowerCase().includes(search) ||
              s.phone?.includes(search)
          );
        }

        // Sort by createdAt client-side (descending - newest first)
        students.sort((a, b) => {
          const aDate = a.createdAt instanceof Date ? a.createdAt :
                        typeof a.createdAt === 'string' ? new Date(a.createdAt) :
                        a.createdAt?.toDate?.() || new Date(0);
          const bDate = b.createdAt instanceof Date ? b.createdAt :
                        typeof b.createdAt === 'string' ? new Date(b.createdAt) :
                        b.createdAt?.toDate?.() || new Date(0);
          return bDate.getTime() - aDate.getTime();
        });

        return students;
      } catch (error) {
        console.error("[subscribeToStudents] Query failed:", error);
        // Return empty array instead of crashing
        return [];
      }
    },
    callback
  );
}

export async function getStudent(studentId: string): Promise<Student | null> {
  const result = await fetchDoc(`students/${studentId}`);
  return result as Student | null;
}

/** REST-based polling subscription to a student's activity log */
export function subscribeToActivityLog(
  studentId: string,
  callback: (entries: ActivityLogEntry[]) => void
): () => void {
  const structuredQuery = {
    from: [{ collectionId: "activityLog" }],
    orderBy: [
      { field: { fieldPath: "createdAt" }, direction: "DESCENDING" },
    ],
  };

  return createSubscription<ActivityLogEntry>(
    async () => {
      return (await runQuery(
        structuredQuery,
        `students/${studentId}`
      )) as ActivityLogEntry[];
    },
    callback
  );
}

/** Subscribe to recent activity log across ALL students (admin dashboard) */
export function subscribeToRecentActivities(
  callback: (entries: ActivityLogEntry[]) => void
): () => void {
  const structuredQuery = {
    from: [{ collectionId: "activityLog", allDescendants: true }],
    orderBy: [
      { field: { fieldPath: "createdAt" }, direction: "DESCENDING" },
    ],
    limit: 20,
  };

  return createSubscription<ActivityLogEntry>(
    async () => {
      return (await runQuery(structuredQuery)) as ActivityLogEntry[];
    },
    callback
  );
}

export async function createStudent(
  data: {
    fullName: string;
    phone: string;
    email?: string;
    leadSource: string;
    assignedSalesRepId: string;
    assignedSalesRepName: string;
  },
  userId: string,
  userName: string
): Promise<string> {
  const now = new Date();
  const studentData: Record<string, unknown> = {
    ...data,
    email: data.email || "",
    registrationDate: now,
    status: "lead" as StudentStatus,
    isArchived: false,
    archivedAt: null,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
    evaluation: {
      placementTestScore: null,
      interviewStatus: "not_completed",
      interviewNotes: "",
      finalLevel: null,
      evaluatedAt: null,
      evaluatedBy: null,
    },
    paymentSummary: {
      totalFees: 0,
      amountPaid: 0,
      remainingBalance: 0,
      paymentStatus: "pending",
      hasOverdue: false,
    },
    ieltsSummary: {
      totalPaid: 0,
      paymentsCount: 0,
    },
  };

  const newId = await restCreate("students", studentData);

  try {
    await writeAuditLog({ action: "create", entityType: "student", entityId: newId, userId, userName });
    await addActivityLogEntry(newId, {
      type: "note",
      description: "Student record created",
      createdBy: userId,
      createdByName: userName,
      followUpDate: null,
    });
  } catch (e) {
    console.warn("[student-service] audit/activity log failed (non-blocking):", e);
  }

  return newId;
}

export async function updateStudent(
  studentId: string,
  data: Partial<Student>,
  userId: string,
  userName: string,
  changes?: Record<string, { from: unknown; to: unknown }>
) {
  await restUpdate(`students/${studentId}`, { ...data, updatedAt: new Date() });

  if (changes && Object.keys(changes).length > 0) {
    try {
      await writeAuditLog({ action: "update", entityType: "student", entityId: studentId, userId, userName, changes });
    } catch (e) {
      console.warn("[student-service] audit log failed:", e);
    }
  }
}

export async function updateStudentStatus(
  studentId: string,
  newStatus: StudentStatus,
  userId: string,
  userName: string,
  lostReason?: string
) {
  const student = await getStudent(studentId);
  if (!student) return;

  const updateData: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };
  if (newStatus === "lost" && lostReason) updateData.lostReason = lostReason;

  await restUpdate(`students/${studentId}`, updateData);

  try {
    await addActivityLogEntry(studentId, {
      type: "status_change",
      description: `Status changed from ${student.status} to ${newStatus}${lostReason ? ` (Reason: ${lostReason})` : ""}`,
      previousValue: student.status,
      newValue: newStatus,
      createdBy: userId,
      createdByName: userName,
      followUpDate: null,
    });
    await writeAuditLog({ action: "update", entityType: "student", entityId: studentId, userId, userName, changes: { status: { from: student.status, to: newStatus } } });
  } catch (e) {
    console.warn("[student-service] log failed:", e);
  }
}

export async function archiveStudent(studentId: string, userId: string, userName: string) {
  await restUpdate(`students/${studentId}`, { isArchived: true, archivedAt: new Date(), updatedAt: new Date() });
  try { await writeAuditLog({ action: "archive", entityType: "student", entityId: studentId, userId, userName }); } catch { /* non-blocking */ }
}

export async function restoreStudent(studentId: string, userId: string, userName: string) {
  await restUpdate(`students/${studentId}`, { isArchived: false, archivedAt: null, updatedAt: new Date() });
  try { await writeAuditLog({ action: "restore", entityType: "student", entityId: studentId, userId, userName }); } catch { /* non-blocking */ }
}

export async function getStudentCounts(role: UserRole, userId: string): Promise<Record<StudentStatus, number>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filtersArr: any[] = [
    {
      fieldFilter: {
        field: { fieldPath: "isArchived" },
        op: "EQUAL",
        value: { booleanValue: false },
      },
    },
  ];

  if (role === "sales") {
    filtersArr.push({
      fieldFilter: {
        field: { fieldPath: "assignedSalesRepId" },
        op: "EQUAL",
        value: { stringValue: userId },
      },
    });
  }

  const where =
    filtersArr.length === 1
      ? filtersArr[0]
      : { compositeFilter: { op: "AND", filters: filtersArr } };

  const structuredQuery = {
    from: [{ collectionId: "students" }],
    where,
  };

  const students = await runQuery(structuredQuery);
  const counts: Record<string, number> = { lead: 0, contacted: 0, evaluated: 0, enrolled: 0, paid: 0, lost: 0 };
  students.forEach((s) => {
    const status = s.status as string;
    if (counts[status] !== undefined) counts[status]++;
  });
  return counts as Record<StudentStatus, number>;
}

export async function deleteStudent(studentId: string, userId: string, userName: string) {
  // Fetch subcollection docs via REST then delete via REST
  try {
    const token = await restGetToken();

    // Delete activity log subcollection
    const activityQuery = {
      structuredQuery: { from: [{ collectionId: "activityLog" }] },
    };
    const actRes = await fetch(`${BASE}/students/${studentId}:runQuery`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(activityQuery),
      cache: "no-store",
    });
    if (actRes.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const actDocs = (await actRes.json()).filter((r: any) => r.document);
      for (const r of actDocs) {
        const docId = (r.document.name as string).split("/").pop();
        await restDelete(`students/${studentId}/activityLog/${docId}`);
      }
    }

    // Delete payments subcollection
    const payQuery = {
      structuredQuery: { from: [{ collectionId: "payments" }] },
    };
    const payRes = await fetch(`${BASE}/students/${studentId}:runQuery`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payQuery),
      cache: "no-store",
    });
    if (payRes.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payDocs = (await payRes.json()).filter((r: any) => r.document);
      for (const r of payDocs) {
        const docId = (r.document.name as string).split("/").pop();
        await restDelete(`students/${studentId}/payments/${docId}`);
      }
    }
  } catch (e) {
    console.warn("[student-service] subcollection delete failed:", e);
  }
  await restDelete(`students/${studentId}`);
  try { await writeAuditLog({ action: "delete", entityType: "student", entityId: studentId, userId, userName }); } catch { /* non-blocking */ }
}
