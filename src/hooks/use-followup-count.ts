"use client";

// Disabled: collection group queries on activityLog require indexes
// that are not yet available. Returns 0 to prevent error flooding.
// TODO: Re-enable when collection group indexes are created in Firebase Console.
export function useFollowupCount(): number {
  return 0;
}
