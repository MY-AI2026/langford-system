import type { Timestamp } from "firebase/firestore";
import {
  runQuery,
  createSubscription,
  restCreate,
  restUpdate,
} from "@/lib/firebase/rest-helpers";

export interface AttendanceSession {
  id: string;
  date: Timestamp;
  isPresent: boolean;
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
