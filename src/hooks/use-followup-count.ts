"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/config";
import { runQuery, createSubscription } from "@/lib/firebase/rest-helpers";

interface ActivityLogRow {
  type?: string;
  followUpDate?: { toDate?: () => Date; seconds?: number } | null;
  isFollowUpDone?: boolean;
}

export function useFollowupCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cleanupSubscription: (() => void) | null = null;

    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (cleanupSubscription) {
        cleanupSubscription();
        cleanupSubscription = null;
      }
      if (!user) {
        setCount(0);
        return;
      }

      const structuredQuery = {
        from: [{ collectionId: "activityLog", allDescendants: true }],
        where: {
          fieldFilter: {
            field: { fieldPath: "isFollowUpDone" },
            op: "EQUAL",
            value: { booleanValue: false },
          },
        },
      };

      cleanupSubscription = createSubscription<ActivityLogRow>(
        async () => (await runQuery(structuredQuery)) as ActivityLogRow[],
        (entries) => {
          const endOfToday = new Date();
          endOfToday.setHours(23, 59, 59, 999);

          let due = 0;
          for (const data of entries) {
            if (data.type !== "follow_up") continue;
            if (!data.followUpDate) continue;

            let followUpDate: Date | null = null;
            if (typeof data.followUpDate.toDate === "function") {
              followUpDate = data.followUpDate.toDate();
            } else if (typeof data.followUpDate.seconds === "number") {
              followUpDate = new Date(data.followUpDate.seconds * 1000);
            }

            if (followUpDate && followUpDate <= endOfToday) due++;
          }
          setCount(due);
        },
        30000
      );
    });

    return () => {
      unsubAuth();
      if (cleanupSubscription) cleanupSubscription();
    };
  }, []);

  return count;
}
