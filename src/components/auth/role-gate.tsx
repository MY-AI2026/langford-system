"use client";

import { useAuth } from "@/contexts/auth-context";
import { UserRole } from "@/lib/types";

interface RoleGateProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({ allowedRoles, children, fallback }: RoleGateProps) {
  const { role, loading } = useAuth();

  // Still loading auth — show nothing (prevents flashing "permission denied")
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  if (!role || !allowedRoles.includes(role)) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">
          You don&apos;t have permission to view this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
