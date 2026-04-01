"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/config";
import { runQuery, createSubscription } from "@/lib/firebase/rest-helpers";

export function useFollowupCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Wait for auth to be ready
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (!user) return;

      // collectionGroup query: allDescendants + filter for isFollowUpDone == false
      const structuredQuery = {
        from: [{ collectionId: "activityLog", allDescendants: true }],
        where: {
          compositeFilter: {
            op: "AND",
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: "isFollowUpDone" },
                  op: "EQUAL",
                  value: { booleanValue: false },
                },
              },
            ],
          },
        },
      };

      const unsub = createSubscription(
        async () => {
          return await runQuery(structuredQuery);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (entries: any[]) => {
          const endOfToday = new Date();
          endOfToday.setHours(23, 59, 59, 999);

          let due = 0;
          entries.forEach((data) => {
            if (data.type !== "follow_up") return;
            if (!data.followUpDate) return;

            let followUpDate: Date | null = null;
            if (data.followUpDate?.toDate) {
              followUpDate = data.followUpDate.toDate();
            } else if (data.followUpDate?.seconds) {
              followUpDate = new Date(data.followUpDate.seconds * 1000);
            }

            if (followUpDate && followUpDate <= endOfToday) {
              due++;
            }
          });

          setCount(due);
        },
        5000
      );

      // Store cleanup for this subscription
      cleanupRef = unsub;
    });

    let cleanupRef: (() => void) | null = null;

    return () => {
      unsubAuth();
      if (cleanupRef) cleanupRef();
    };
  }, []);

  return count;
}
