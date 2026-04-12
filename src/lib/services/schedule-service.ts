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
  const ids: string[] = [];

  for (const dayOfWeek of days) {
    const id = await createScheduleEntry({
      ...data,
      dayOfWeek,
      dayPattern: pattern,
      patternGroupId,
    });
    ids.push(id);
  }

  return ids;
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
  for (const entry of entries) {
    await updateScheduleEntry(entry.id, data);
  }
}

/** Delete a single schedule entry */
export async function deleteScheduleEntry(entryId: string): Promise<void> {
  await restDelete(`schedules/${entryId}`);
}

/** Delete all entries in a pattern group */
export async function deleteSchedulePattern(patternGroupId: string): Promise<void> {
  const entries = await getEntriesByPatternGroup(patternGroupId);
  for (const entry of entries) {
    await restDelete(`schedules/${entry.id}`);
  }
}

/** Get entries by pattern group ID */
async function getEntriesByPatternGroup(patternGroupId: string): Promise<ScheduleEntry[]> {
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
}

/** Fetch enrolled students for a course with their names and levels */
export async function fetchStudentsForCourse(courseId: string): Promise<ScheduleStudent[]> {
  // Fetch all students and check their enrollments subcollections
  const allStudents = (await fetchCollection("students")) as Student[];
  const students: ScheduleStudent[] = [];

  const batchSize = 10;
  for (let i = 0; i < allStudents.length; i += batchSize) {
    const batch = allStudents.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (student) => {
        try {
          const enrollments = await runQuery(
            {
              from: [{ collectionId: "enrollments" }],
              where: {
                fieldFilter: {
                  field: { fieldPath: "courseId" },
                  op: "EQUAL",
                  value: { stringValue: courseId },
                },
              },
            },
            `students/${student.id}`
          );
          const active = enrollments.filter(
            (e: Record<string, unknown>) => e.status === "active"
          );
          if (active.length > 0) {
            return {
              studentId: student.id,
              studentName: student.fullName || "Unknown Student",
              level: student.evaluation?.finalLevel || null,
            };
          }
        } catch (err) {
          console.error(`[schedule] Error fetching enrollments for student ${student.id}:`, err);
        }
        return null;
      })
    );
    for (const r of results) {
      if (r) students.push(r);
    }
  }

  return students;
}

/** Get all active instructors */
export async function getInstructors(): Promise<User[]> {
  const results = await fetchCollection("users");
  return results
    .map((r) => ({ ...r, uid: r.id }) as User)
    .filter((u) => u.role === "instructor" && u.isActive !== false);
}

/** Check for time conflicts for a specific instructor on a given day */
export async function checkTimeConflict(
  instructorId: string,
  dayOfWeek: DayOfWeek,
  startTime: string,
  endTime: string,
  excludeEntryId?: string
): Promise<ScheduleEntry | null> {
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
}
