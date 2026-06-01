"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { REG_ROUTES } from "@/lib/registration/constants";

/**
 * `/registration` entry — role-aware redirect.
 *
 * Lands the user on the correct surface for their role and bounces anyone
 * outside the module back to the main dashboard. No UI of its own.
 */
export default function RegistrationEntryPage() {
  const router = useRouter();
  const { role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (role === "acceptix_agent") {
      router.replace(REG_ROUTES.registerStudent);
    } else {
      // Anyone else (including admin) belongs in the main Langford
      // dashboard. The Acceptix admin surface lives at /acceptix/*.
      router.replace("/dashboard");
    }
  }, [role, loading, router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
    </div>
  );
}
