"use client";

import { useEffect, useState } from "react";
import { subscribeToStudents } from "@/lib/services/student-service";
import { countStudentsDueForFollowUp } from "@/lib/utils/followups";
import { useAuth } from "@/contexts/auth-context";

/**
 * Live count of students needing follow-up, for the sidebar badge.
 *
 * Derived from the same stale-student logic the dashboard reminders widget
 * uses (see `followups.ts`), off the students subscription — no collection-group
 * query and therefore no extra index required.
 */
export function useFollowupCount(): number {
  const { role, firebaseUser } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!role || !firebaseUser?.uid) {
      setCount(0);
      return;
    }
    const unsub = subscribeToStudents(
      { role, userId: firebaseUser.uid },
      (students) => setCount(countStudentsDueForFollowUp(students))
    );
    return () => unsub();
  }, [role, firebaseUser?.uid]);

  return count;
}
