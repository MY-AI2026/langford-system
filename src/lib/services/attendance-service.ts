import type { Timestamp } from "firebase/firestore";
import {
  runQuery,
  createSubscription,
  restCreate,
  restUpdate,
  restSet,
} from "@/lib/firebase/rest-helpers";

export type AttendanceStatus = "present" | "absent" | "late";

export interface AttendanceSession {
  id: string;
  date: Timestamp;
  isPresent: boolean;
  status?: AttendanceStatus; // present | absent | late (added later; may be absent on old rows)
  courseId?: string;
  createdAt: Timestamp;
}

/** REST-based polling subscription (replaces onSnapshot) */
export function subscribeToAttendance(
  studentId: string,
  callback: (sessions: AttendanceSession[]) => void
): () => void {
  const structuredQuery = {
    from: [{ collectionId: "attendance" }],
    orderBy: [
      { field: { fieldPath: "date" }, direction: "DESCENDING" },
    ],
  };

  return createSubscription<AttendanceSession>(
    async () => {
      return (await runQuery(
        structuredQuery,
        `students/${studentId}`
      )) as AttendanceSession[];
    },
    callback,
    5000
  );
}

export async function addSession(
  studentId: string,
  date: Date,
  isPresent: boolean
): Promise<string> {
  return restCreate(
    `students/${studentId}/attendance`,
    {
      date,
      isPresent,
      createdAt: new Date(),
    }
  );
}

export async function updateSession(
  studentId: string,
  sessionId: string,
  isPresent: boolean
): Promise<void> {
  await restUpdate(
    `students/${studentId}/attendance/${sessionId}`,
    { isPresent }
  );
}

/**
 * Record a class attendance entry idempotently. Uses a deterministic doc id
 * (`{courseId}_{yyyy-mm-dd}`) and upserts, so re-saving the same day for the
 * same course/student overwrites instead of creating a duplicate session.
 * Stores the full `status` (present | absent | late) plus `isPresent` for
 * backward compatibility with the per-student attendance view.
 */
export async function recordAttendance(
  studentId: string,
  date: Date,
  status: AttendanceStatus,
  courseId?: string
): Promise<void> {
  const dateKey = date.toISOString().slice(0, 10); // yyyy-mm-dd
  const docId = `${courseId ?? "x"}_${dateKey}`;
  await restSet(`students/${studentId}/attendance/${docId}`, {
    date,
    status,
    isPresent: status === "present" || status === "late",
    courseId: courseId ?? null,
    updatedAt: new Date(),
  });
}
