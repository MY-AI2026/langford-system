"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { OrganizerShell } from "@/components/organizer/organizer-shell";

/**
 * Root layout for the Academic Organizer portal.
 *
 * - `ProtectedRoute` guards against unauthenticated access (redirects to /login).
 * - `OrganizerShell` provides the module-specific chrome (RTL topbar, drawer,
 *   role-aware sidebar) — completely separate from the main dashboard.
 */
export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <OrganizerShell>{children}</OrganizerShell>
    </ProtectedRoute>
  );
}
