import { ScheduleEntry, ScheduleStudent, DayPattern, DayOfWeek, User, Student } from "@/lib/types";
import {
  fetchCollection,
  createSubscription,
  runQuery,
  restCreate,
  restUpdate,
  restDelete,
  fetchDoc,
} from "@/lib/firebase/rest-helpers";

export type ScheduleEntryInput = Omit<ScheduleEntry, "id" | "createdAt" | "updatedAt">;

// Day pattern mappings
const PATTERN_DAYS: Record<Exclude<DayPattern, "custom">, DayOfWeek[]> = {
  sat_mon_wed: [6, 1, 3], // Saturday, Monday, Wednesday
  sun_tue_thu: [0, 2, 4], // Sunday, Tuesday, Thursday
};

/** Subscribe to schedule entries for a specific instructor */
export function subscribeToSchedulesByInstructor(
  instructorId: string,
  callback: (entries: ScheduleEntry[]) => void
): () => void {
  const structuredQuery = {
    from: [{ collectionId: "schedules" }],
    where: {
      fieldFilter: {
        field: { fieldPath: "instructorId" },
        op: "EQUAL",
        value: { stringValue: instructorId },
      },
    },
  };

  return createSubscription<ScheduleEntry>(
    async () => {
      const results = (await runQuery(structuredQuery)) as ScheduleEntry[];
      return results
        .filter((e) => e.isActive !== false)
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
    },
    callback,
    10000
  );
}

/** Subscribe to all active schedule entries (for coordinator/admin) */
export function subscribeToAllSchedules(
  callback: (entries: ScheduleEntry[]) => void
): () => void {
  return createSubscription<ScheduleEntry>(
    async () => {
      const results = await fetchCollection("schedules", "dayOfWeek", "ASCENDING");
      return (results as ScheduleEntry[]).filter((e) => e.isActive !== false);
    },
    callback,
    10000
  );
}

/** Create a single schedule entry */
export async function createScheduleEntry(
  data: Omit<ScheduleEntryInput, "createdAt" | "updatedAt">
): Promise<string> {
  const now = new Date();
  return restCreate("schedules", {
    ...data,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
}

/** Create schedule entries for a day pattern (3 entries for Sat/Mon/Wed or Sun/Tue/Thu) */
export async function createSchedulePattern(
  data: Omit<ScheduleEntryInput, "dayOfWeek" | "patternGroupId" | "createdAt" | "updatedAt">,
  pattern: Exclude<DayPattern, "custom">
): Promise<string[]> {
  const days = PATTERN_DAYS[pattern];
  const patternGroupId = `pg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // Create all three day entries in parallel — saves ~2 round-trips vs sequential.
  return Promise.all(
    days.map((dayOfWeek) =>
      createScheduleEntry({
        ...data,
        dayOfWeek,
        dayPattern: pattern,
        patternGroupId,
      })
    )
  );
}

/** Update a single schedule entry */
export async function updateScheduleEntry(
  entryId: string,
  data: Partial<ScheduleEntryInput>
): Promise<void> {
  await restUpdate(`schedules/${entryId}`, {
    ...data,
    updatedAt: new Date(),
  });
}

/** Update all entries in a pattern group */
export async function updateSchedulePattern(
  patternGroupId: string,
  data: Partial<Omit<ScheduleEntryInput, "dayOfWeek" | "patternGroupId">>
): Promise<void> {
  const entries = await getEntriesByPatternGroup(patternGroupId);
  await Promise.all(entries.map((entry) => updateScheduleEntry(entry.id, data)));
}

/** Delete a single schedule entry */
export async function deleteScheduleEntry(entryId: string): Promise<void> {
  await restDelete(`schedules/${entryId}`);
}

/** Delete all entries in a pattern group */
export async function deleteSchedulePattern(patternGroupId: string): Promise<void> {
  const entries = await getEntriesByPatternGroup(patternGroupId);
  await Promise.all(
    entries.map((entry) =>
      restDelete(`schedules/${entry.id}`).catch((e) =>
        console.warn(`[schedule] delete ${entry.id} failed:`, e)
      )
    )
  );
}

/** Get entries by pattern group ID. Returns [] on any error — callers can safely no-op. */
async function getEntriesByPatternGroup(patternGroupId: string): Promise<ScheduleEntry[]> {
  try {
    const structuredQuery = {
      from: [{ collectionId: "schedules" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "patternGroupId" },
          op: "EQUAL",
          value: { stringValue: patternGroupId },
        },
      },
    };
    return (await runQuery(structuredQuery)) as ScheduleEntry[];
  } catch (e) {
    console.error("[schedule] getEntriesByPatternGroup failed:", e);
    return [];
  }
}

/** Fetch enrolled students for a course with their names and levels */
export async function fetchStudentsForCourse(courseId: string): Promise<ScheduleStudent[]> {
  try {
    // Collection group query across all students' enrollments subcollections
    const enrollments = await runQuery({
      from: [{ collectionId: "enrollments", allDescendants: true }],
      where: {
        fieldFilter: {
          field: { fieldPath: "courseId" },
          op: "EQUAL",
          value: { stringValue: courseId },
        },
      },
    });

    // Filter active enrollments
    const activeEnrollments = enrollments.filter(
      (e: Record<string, unknown>) => e.status === "active"
    );

    if (activeEnrollments.length === 0) return [];

    // Pick one enrollment per student (de-duplicate). Keep the enrollment id
    // so the caller can later delete that exact enrollment record.
    const enrollmentByStudentId = new Map<string, { enrollmentId: string }>();
    for (const e of activeEnrollments as Array<Record<string, unknown>>) {
      const sid = e.studentId as string | undefined;
      const eid = e.id as string | undefined;
      if (!sid || !eid) continue;
      if (!enrollmentByStudentId.has(sid)) {
        enrollmentByStudentId.set(sid, { enrollmentId: eid });
      }
    }

    const studentIds = [...enrollmentByStudentId.keys()];

    // Fetch student details in parallel
    const students: ScheduleStudent[] = [];
    const results = await Promise.all(
      studentIds.map(async (sid) => {
        try {
          const student = await fetchDoc(`students/${sid}`) as Student | null;
          if (student) {
            return {
              studentId: sid,
              studentName: student.fullName || "Unknown Student",
              level: student.evaluation?.finalLevel || null,
              enrollmentId: enrollmentByStudentId.get(sid)!.enrollmentId,
            };
          }
        } catch (err) {
          console.error(`[schedule] Error fetching student ${sid}:`, err);
        }
        return null;
      })
    );

    for (const r of results) {
      if (r) students.push(r);
    }

    return students;
  } catch (err) {
    console.error("[schedule] fetchStudentsForCourse error:", err);
    return [];
  }
}

/** Get all active instructors. Returns [] on any error so the UI degrades to an empty list. */
export async function getInstructors(): Promise<User[]> {
  try {
    const results = await fetchCollection("users");
    return results
      .map((r) => ({ ...r, uid: r.id }) as User)
      .filter((u) => u.role === "instructor" && u.isActive !== false);
  } catch (e) {
    console.error("[schedule] getInstructors failed:", e);
    return [];
  }
}

/** Check for time conflicts for a specific instructor on a given day.
 * Returns null both when there's no conflict and when the query fails —
 * the caller treats null as "no known conflict" and falls back to other checks. */
export async function checkTimeConflict(
  instructorId: string,
  dayOfWeek: DayOfWeek,
  startTime: string,
  endTime: string,
  excludeEntryId?: string
): Promise<ScheduleEntry | null> {
  try {
    const structuredQuery = {
      from: [{ collectionId: "schedules" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "instructorId" },
          op: "EQUAL",
          value: { stringValue: instructorId },
        },
      },
    };

    const allEntries = (await runQuery(structuredQuery)) as ScheduleEntry[];
    const entries = allEntries.filter(
      (e) => e.isActive !== false && e.dayOfWeek === dayOfWeek
    );

    for (const entry of entries) {
      if (excludeEntryId && entry.id === excludeEntryId) continue;
      // Check overlap: new start < existing end AND new end > existing start
      if (startTime < entry.endTime && endTime > entry.startTime) {
        return entry;
      }
    }

    return null;
  } catch (e) {
    console.error("[schedule] checkTimeConflict failed:", e);
    return null;
  }
}
