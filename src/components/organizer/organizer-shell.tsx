"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { ORG_ROUTES } from "@/lib/organizer/constants";
import { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppFooter } from "@/components/layout/app-footer";
import { LogOut, Menu, Users, CalendarClock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Exclusive to the academic organizer — no other role (not even admin). */
function navLinksForRole(role: UserRole | null): NavLink[] {
  if (role === "academic_organizer") {
    return [
      { href: ORG_ROUTES.students, label: "الطلبة المدفوعين", icon: Users },
      { href: ORG_ROUTES.classes, label: "الجداول والحصص", icon: CalendarClock },
    ];
  }
  return [];
}

export function OrganizerShell({ children }: { children: React.ReactNode }) {
  const { role, userData } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const links = navLinksForRole(role);

  async function handleLogout() {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (e) {
      console.error("[organizer-shell] sign out failed:", e);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background" dir="rtl">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
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
                    <SheetTitle className="sr-only">التنقّل</SheetTitle>
                    <SidebarBody
                      links={links}
                      pathname={pathname}
                      onLinkClick={() => setDrawerOpen(false)}
                    />
                  </SheetContent>
                </Sheet>
              </>
            )}

            <Link href={ORG_ROUTES.students} className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Langford"
                width={36}
                height={36}
                className="rounded-md"
                priority
              />
              <div className="hidden flex-col leading-tight sm:flex">
                <span className="text-sm font-semibold text-foreground">
                  المنظّم الأكاديمي
                </span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Langford — Academic Organizer
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {userData?.displayName && (
              <span className="hidden text-sm text-muted-foreground md:inline">
                {userData.displayName}
              </span>
            )}
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="ms-2 h-4 w-4" />
              <span className="hidden sm:inline">تسجيل الخروج</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        {links.length > 0 && (
          <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 border-s lg:block">
            <SidebarBody links={links} pathname={pathname} />
          </aside>
        )}
        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>

      <AppFooter />
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
