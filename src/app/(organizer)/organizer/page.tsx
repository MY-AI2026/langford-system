"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { ORG_ROUTES } from "@/lib/organizer/constants";

/**
 * `/organizer` entry — role-aware redirect. Organizers (and admins overseeing
 * the module) land on the paid-students screen; anyone else is bounced to the
 * main dashboard.
 */
export default function OrganizerEntryPage() {
  const router = useRouter();
  const { role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (role === "academic_organizer" || role === "admin") {
      router.replace(ORG_ROUTES.students);
    } else {
      router.replace("/dashboard");
    }
  }, [role, loading, router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
    </div>
  );
}
