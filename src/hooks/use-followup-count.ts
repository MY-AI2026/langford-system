"use client";

// Intentionally returns 0 — see README below.
//
// To compute this we'd need a collection-group query across every student's
// activityLog subcollection, filtered by `type == "follow_up"` and a future
// `followUpDate` AND `isFollowUpDone == false`. That requires a composite
// index that hasn't been created (deliberately — adding it would let the
// sidebar fan out one extra heavy query per session).
//
// Used by `src/components/layout/sidebar.tsx` to render the badge next to the
// "Follow-ups" nav item. Returning 0 hides the badge.
//
// To re-enable: (1) create the composite index in Firebase Console for
// collection-group `activityLog` on (type, isFollowUpDone, followUpDate),
// then (2) subscribe via runQuery with `allDescendants: true`.
export function useFollowupCount(): number {
  return 0;
}
