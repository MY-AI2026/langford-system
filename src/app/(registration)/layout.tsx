"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { RegistrationShell } from "@/components/registration/registration-shell";

/**
 * Root layout for the Acceptix Registration Module.
 *
 * - `ProtectedRoute` guards against unauthenticated access (redirects to /login).
 * - `RegistrationShell` provides the module-specific chrome (topbar, drawer,
 *   role-aware sidebar). Built in PR #2; for PR #1 it renders a minimal shell.
 */
export default function RegistrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <RegistrationShell>{children}</RegistrationShell>
    </ProtectedRoute>
  );
}
