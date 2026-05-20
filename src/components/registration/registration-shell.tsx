"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { REG_ROUTES } from "@/lib/registration/constants";
import { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  GraduationCap,
  LogOut,
  Menu,
  UserPlus,
  ListChecks,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Per-role navigation. Only links with a working page are shown — admin
 * links resolve in PR #3 and are gated behind a feature flag here so they
 * don't 404 before then. */
function navLinksForRole(role: UserRole | null): NavLink[] {
  if (role === "acceptix_agent") {
    return [
      { href: REG_ROUTES.registerStudent, label: "تسجيل طالب", icon: UserPlus },
      { href: REG_ROUTES.myStudents, label: "طلبتي", icon: ListChecks },
    ];
  }
  if (role === "admin") {
    return [
      // Admin sees the agent surfaces too (useful for QA / fallback create).
      // Admin-only routes (dashboard, all-students, agents, courses, reports)
      // land in PR #3 and will be added here then.
      { href: REG_ROUTES.registerStudent, label: "تسجيل طالب", icon: UserPlus },
      { href: REG_ROUTES.myStudents, label: "طلبتي", icon: ListChecks },
    ];
  }
  return [];
}

export function RegistrationShell({ children }: { children: React.ReactNode }) {
  const { role, userData } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const links = navLinksForRole(role);
  const homeHref =
    role === "admin"
      ? REG_ROUTES.registerStudent
      : role === "acceptix_agent"
        ? REG_ROUTES.registerStudent
        : "/";

  async function handleLogout() {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (e) {
      console.error("[registration-shell] sign out failed:", e);
    }
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {/* Mobile menu trigger (controlled — keeps the Button outside
                the SheetTrigger so we don't depend on `asChild` support). */}
            {links.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="القائمة"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                  <SheetContent side="right" className="w-64 p-0">
                    <SheetTitle className="sr-only">قائمة التنقّل</SheetTitle>
                    <SidebarBody
                      links={links}
                      pathname={pathname}
                      onLinkClick={() => setDrawerOpen(false)}
                    />
                  </SheetContent>
                </Sheet>
              </>
            )}

            <Link
              href={homeHref}
              className="flex items-center gap-2 font-semibold"
            >
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="hidden sm:inline">Langford × Acceptix</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {userData?.displayName && (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {userData.displayName}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="ml-2 h-4 w-4" />
              <span className="hidden sm:inline">تسجيل خروج</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Body: sidebar (desktop) + content ──────────────────────────────── */}
      <div className="mx-auto flex max-w-7xl">
        {links.length > 0 && (
          <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 border-l lg:block">
            <SidebarBody links={links} pathname={pathname} />
          </aside>
        )}
        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function SidebarBody({
  links,
  pathname,
  onLinkClick,
}: {
  links: NavLink[];
  pathname: string;
  onLinkClick?: () => void;
}) {
  return (
    <nav className="flex h-full flex-col gap-1 p-4">
      {links.map((link) => {
        const Icon = link.icon;
        const active =
          pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onLinkClick}
            className={[
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            ].join(" ")}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4" />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
