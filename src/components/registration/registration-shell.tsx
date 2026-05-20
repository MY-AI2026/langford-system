"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { REG_ROUTES } from "@/lib/registration/constants";
import { Button } from "@/components/ui/button";
import { LogOut, GraduationCap } from "lucide-react";

/**
 * Minimal shell for PR #1 — gets the route group rendering without depending on
 * the dashboard sidebar. PR #2 swaps the body for role-aware navigation (agent
 * vs admin) and adds the notification drawer.
 */
export function RegistrationShell({ children }: { children: React.ReactNode }) {
  const { role, userData } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (e) {
      console.error("[registration-shell] sign out failed:", e);
    }
  }

  const homeHref =
    role === "admin"
      ? REG_ROUTES.adminDashboard
      : role === "acceptix_agent"
        ? REG_ROUTES.registerStudent
        : "/";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href={homeHref} className="flex items-center gap-2 font-semibold">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span>Langford × Acceptix</span>
          </Link>

          <div className="flex items-center gap-3">
            {userData?.displayName && (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {userData.displayName}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="ml-2 h-4 w-4" />
              تسجيل خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 lg:p-6">{children}</main>
    </div>
  );
}
